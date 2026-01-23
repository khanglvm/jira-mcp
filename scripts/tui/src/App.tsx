/**
 * @file App.tsx
 * @description Main installer application with keyboard handling
 * Following OpenTUI patterns: centralized keyboard handler, modal priority, fixed-flexible layout
 */

import { useState, useEffect, useMemo } from 'react';
import { useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/react';
import { colors } from './theme.ts';
import { detectTools, type DetectionResult } from './detection.ts';
import { getConfigPath } from './detection.ts';
import { injectConfig, type InjectionResult } from './config.ts';
import { batchInstall, type InstallResult } from './batch-installer.ts';
import { validateBatchScopes } from './validation.ts';
import { createRegistry } from '../../src/mcp-registry.js';
import type { CredentialsForm, ViewMode } from './types.ts';
import { useKeyboardHandlers } from './hooks/use-keyboard-handlers.ts';
import {
    Header,
    Footer,
    ToolMenu,
    MultiToolSelector,
    ScopeSelector,
    CredentialsPanel,
    ConfirmPanel,
    ResultPanel,
    BatchResultPanel,
} from './components/index.ts';

const VERSION = '1.0.0';

/** Main installer application */
export function App() {
    const { width, height } = useTerminalDimensions();
    const renderer = useRenderer();

    // MCP Registry state
    const [registry, setRegistry] = useState<typeof import('../../src/mcp-registry.js').McpRegistry | null>(null);
    const [tools, setTools] = useState<DetectionResult[]>([]);
    const [legacyTools, setLegacyTools] = useState<any[]>([]);

    // App state
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [view, setView] = useState<ViewMode>('menu');
    const [selectedTool, setSelectedTool] = useState<any | null>(null);

    // Multi-select state
    const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
    const [multiSelectCursorIndex, setMultiSelectCursorIndex] = useState(0);

    // Scope selection state
    const [selectedScope, setSelectedScope] = useState<'user' | 'project'>('user');
    const [validationResults, setValidationResults] = useState<any[]>([]);

    // Form state
    const [form, setForm] = useState<CredentialsForm>(() => ({
        baseUrl: process.env.JIRA_MCP_URL || '',
        username: '',
        password: ''
    }));
    const [currentField, setCurrentField] = useState<'url' | 'username' | 'password'>(
        () => process.env.JIRA_MCP_URL ? 'username' : 'url'
    );
    const [inputBuffer, setInputBuffer] = useState('');

    // Result state
    const [result, setResult] = useState<InjectionResult | null>(null);
    const [batchResults, setBatchResults] = useState<InstallResult[]>([]);

    // Initialize registry and detect tools
    useEffect(() => {
        (async () => {
            try {
                const mcpRegistry = await createRegistry();
                setRegistry(mcpRegistry);
                const detectedTools = await detectTools(mcpRegistry);
                setTools(detectedTools);
                setLegacyTools(detectedTools as any);
            } catch (error) {
                console.error('Failed to initialize MCP registry:', error);
                // Fallback to legacy detection
                const fallbackTools = detectTools();
                setLegacyTools(fallbackTools);
            }
        })();
    }, []);

    // Exit if no tools detected
    useEffect(() => {
        if (legacyTools.length === 0) {
            console.error('No supported AI tools detected. Supported: Claude Desktop, Claude Code, OpenCode');
            process.exit(1);
        }
    }, [legacyTools]);

    /**
     * Listen for paste events from the terminal.
     * OpenTUI uses bracketed paste mode - when user pastes (Cmd+V on macOS, Ctrl+V on Linux),
     * the terminal sends the content as a special paste event, not as keyboard input.
     */
    useEffect(() => {
        const handlePaste = (event: { text: string }) => {
            // Only handle paste in credentials view
            if (view !== 'credentials') return;

            const cleanText = event.text.replace(/[\x00-\x1F\x7F]/g, '').trim();
            if (!cleanText) return;

            setForm((prev) => {
                const fieldMap = { url: 'baseUrl', username: 'username', password: 'password' } as const;
                const fieldKey = fieldMap[currentField];
                return { ...prev, [fieldKey]: prev[fieldKey] + cleanText };
            });
        };

        // Subscribe to paste events from OpenTUI's key input handler
        renderer.keyInput.on('paste', handlePaste);

        return () => {
            renderer.keyInput.off('paste', handlePaste);
        };
    }, [renderer, view, currentField]);

    /** Get selected tools array from Set */
    const selectedToolsArray = useMemo(() => {
        return tools.filter(t => selectedTools.has(t.id));
    }, [tools, selectedTools]);

    /** Get validation results for selected tools */
    const selectedValidationResults = useMemo(() => {
        return validationResults.filter(v => selectedTools.has(v.toolId));
    }, [validationResults, selectedTools]);

    /** Centralized keyboard handler with modal priority (early returns) */
    const handleKeyboard = useKeyboardHandlers({
        view,
        tools,
        legacyTools,
        selectedIndex,
        multiSelectCursorIndex,
        selectedTool,
        selectedTools,
        selectedScope,
        validationResults,
        form,
        currentField,
        registry,
        setSelectedIndex,
        setMultiSelectCursorIndex,
        setSelectedTool,
        setSelectedTools,
        setSelectedScope,
        setValidationResults,
        setView,
        setForm,
        setCurrentField,
        setResult,
        setBatchResults,
    });

    useKeyboard(handleKeyboard);

    // Get shortcuts based on current view
    const getShortcuts = () => {
        switch (view) {
            case 'menu':
                return [
                    { key: '↑/k', label: 'Up' },
                    { key: '↓/j', label: 'Down' },
                    { key: 'M', label: 'Multi-select' },
                    { key: 'Enter', label: 'Select' },
                    { key: 'q', label: 'Quit' },
                ];
            case 'multi-select':
                return [
                    { key: '↑/j', label: 'Navigate' },
                    { key: 'Space', label: 'Toggle' },
                    { key: 'a/n', label: 'All/None' },
                    { key: 'Enter', label: 'Confirm' },
                    { key: 'q', label: 'Quit' },
                ];
            case 'scope-select':
                return [
                    { key: 'Space', label: 'Toggle' },
                    { key: 'Enter', label: 'Confirm' },
                    { key: 'Esc', label: 'Back' },
                ];
            case 'credentials':
                return [
                    { key: 'Tab/↓', label: 'Next' },
                    { key: '↑', label: 'Prev' },
                    { key: '⌘/Ctrl+V', label: 'Paste' },
                    { key: 'Ctrl+U', label: 'Clear' },
                    { key: 'Enter', label: 'Proceed' },
                    { key: 'Esc', label: 'Back' },
                ];
            case 'confirm':
                return [
                    { key: 'Y', label: 'Confirm' },
                    { key: 'N', label: 'Cancel' },
                ];
            case 'installing':
                return [
                    { key: '...', label: 'Installing...' },
                ];
            default:
                return [{ key: 'q', label: 'Exit' }];
        }
    };

    return (
        <box style={{
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            backgroundColor: colors.bg.primary,
        }}>
            {/* Fixed header - 1 line */}
            <Header title="Jira MCP Quick Setup" version={VERSION} />

            {/* Flexible content area */}
            <box style={{ flexGrow: 1, padding: 1 }}>
                {view === 'menu' && (
                    <ToolMenu tools={legacyTools} selectedIndex={selectedIndex} />
                )}

                {view === 'multi-select' && (
                    <MultiToolSelector
                        tools={tools}
                        selectedTools={selectedTools}
                        cursorIndex={multiSelectCursorIndex}
                    />
                )}

                {view === 'scope-select' && (
                    <ScopeSelector
                        selectedScope={selectedScope}
                        validationResults={selectedValidationResults}
                    />
                )}

                {view === 'credentials' && (
                    <CredentialsPanel
                        toolName={selectedTools.size > 0
                            ? `${selectedTools.size} tool${selectedTools.size > 1 ? 's' : ''}`
                            : (selectedTool?.name || 'Jira MCP')
                        }
                        form={form}
                        currentField={currentField}
                    />
                )}

                {view === 'confirm' && (
                    <ConfirmPanel
                        toolName={selectedTools.size > 1
                            ? `${selectedTools.size} tools`
                            : (selectedTool?.name || 'Jira MCP')
                        }
                        configPath={selectedScope === 'user'
                            ? 'User/global config'
                            : 'Project config'
                        }
                        form={form}
                    />
                )}

                {view === 'installing' && (
                    <box style={{
                        flexDirection: 'column',
                        border: true,
                        borderColor: colors.border.normal,
                        flexGrow: 1,
                        padding: 1,
                        alignItems: 'center',
                        paddingY: 2,
                    }}>
                        <text fg={colors.fg.primary} bold>Installing Jira MCP...</text>
                        <text> </text>
                        <text fg={colors.fg.muted}>Please wait</text>
                    </box>
                )}

                {view === 'results' && batchResults.length > 0 && (
                    <BatchResultPanel results={batchResults} />
                )}

                {(view === 'success' || view === 'error') && selectedTool && result && (
                    <ResultPanel
                        success={result.success}
                        tool={selectedTool.id}
                        toolName={selectedTool.name}
                        configPath={getConfigPath(selectedTool.id)}
                        backupName={result.backupName}
                        errorMessage={result.message}
                    />
                )}
            </box>

            {/* Fixed footer - 2 lines */}
            <Footer shortcuts={getShortcuts()} />
        </box>
    );
}
