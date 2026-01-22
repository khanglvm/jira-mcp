/**
 * @file App.tsx
 * @description Main installer application with keyboard handling
 * Following OpenTUI patterns: centralized keyboard handler, modal priority, fixed-flexible layout
 */

import { useState, useCallback, useEffect } from 'react';
import { useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/react';
import { colors } from './theme.ts';
import { detectTools } from './detection.ts';
import { getConfigPath } from './detection.ts';
import { injectConfig, type InjectionResult } from './config.ts';
import type { DetectedTool, ViewMode, CredentialsForm, SupportedTool } from './types.ts';
import { Header, Footer, ToolMenu, CredentialsPanel, ConfirmPanel, ResultPanel } from './components/index.ts';

const VERSION = '1.0.0';

/** Main installer application */
export function App() {
    const { width, height } = useTerminalDimensions();
    const renderer = useRenderer();

    // App state
    const [tools] = useState<DetectedTool[]>(() => detectTools());
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [view, setView] = useState<ViewMode>('menu');
    const [selectedTool, setSelectedTool] = useState<DetectedTool | null>(null);

    // Form state
    const [form, setForm] = useState<CredentialsForm>({ baseUrl: '', username: '', password: '' });
    const [currentField, setCurrentField] = useState<'url' | 'username' | 'password'>('url');
    const [inputBuffer, setInputBuffer] = useState('');

    // Result state
    const [result, setResult] = useState<InjectionResult | null>(null);

    // Exit if no tools detected
    useEffect(() => {
        if (tools.length === 0) {
            console.error('No supported AI tools detected. Supported: Claude Desktop, Claude Code, OpenCode');
            process.exit(1);
        }
    }, [tools]);

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

    /** Centralized keyboard handler with modal priority (early returns) */
    const handleKeyboard = useCallback((key: { name: string; shift?: boolean; ctrl?: boolean; meta?: boolean }) => {
        // Result view - only allow quit
        if (view === 'success' || view === 'error') {
            if (key.name === 'q' || key.name === 'Q' || key.name === 'escape') {
                process.exit(0);
            }
            return;
        }

        // Confirm view
        if (view === 'confirm') {
            if (key.name === 'y' || key.name === 'Y') {
                // Inject config
                const tool = selectedTool!;
                const injectionResult = injectConfig(tool.id, form);
                setResult(injectionResult);
                setView(injectionResult.success ? 'success' : 'error');
            } else if (key.name === 'n' || key.name === 'N' || key.name === 'escape') {
                setView('credentials');
            }
            return;
        }

        // Credentials view
        if (view === 'credentials') {
            // Navigation between fields
            if (key.name === 'up' || key.name === 'k') {
                setCurrentField((prev) => {
                    if (prev === 'password') return 'username';
                    if (prev === 'username') return 'url';
                    return prev;
                });
                return;
            }
            if (key.name === 'down' || key.name === 'j') {
                setCurrentField((prev) => {
                    if (prev === 'url') return 'username';
                    if (prev === 'username') return 'password';
                    return prev;
                });
                return;
            }

            // Tab to next field
            if (key.name === 'tab') {
                setCurrentField((prev) => {
                    if (prev === 'url') return 'username';
                    if (prev === 'username') return 'password';
                    return prev;
                });
                return;
            }

            // Enter to proceed
            if (key.name === 'return') {
                // Validate
                if (!form.baseUrl || !form.username || !form.password) {
                    return; // Do nothing if incomplete
                }
                if (!/^https?:\/\//.test(form.baseUrl)) {
                    return; // Invalid URL
                }
                setView('confirm');
                return;
            }

            // Escape to go back
            if (key.name === 'escape') {
                setView('menu');
                setForm({ baseUrl: '', username: '', password: '' });
                setCurrentField('url');
                return;
            }

            // Handle text input
            if (key.name === 'backspace') {
                setForm((prev) => {
                    const fieldMap = { url: 'baseUrl', username: 'username', password: 'password' } as const;
                    const fieldKey = fieldMap[currentField];
                    return { ...prev, [fieldKey]: prev[fieldKey].slice(0, -1) };
                });
                return;
            }

            // Handle Ctrl+W to delete word (common terminal shortcut)
            if (key.ctrl && key.name === 'w') {
                setForm((prev) => {
                    const fieldMap = { url: 'baseUrl', username: 'username', password: 'password' } as const;
                    const fieldKey = fieldMap[currentField];
                    const value = prev[fieldKey];
                    // Delete last word: trim trailing spaces then delete to last space/start
                    const trimmed = value.trimEnd();
                    const lastSpace = trimmed.lastIndexOf(' ');
                    const newValue = lastSpace === -1 ? '' : trimmed.slice(0, lastSpace + 1);
                    return { ...prev, [fieldKey]: newValue };
                });
                return;
            }

            // Handle Ctrl+U to clear line (common terminal shortcut)
            if (key.ctrl && key.name === 'u') {
                setForm((prev) => {
                    const fieldMap = { url: 'baseUrl', username: 'username', password: 'password' } as const;
                    const fieldKey = fieldMap[currentField];
                    return { ...prev, [fieldKey]: '' };
                });
                return;
            }

            // Character input - handles both single chars and pasted text (multi-char)
            // When pasting, OpenTUI sends the entire pasted string as key.name
            // Filter out ctrl/meta modified keys to avoid conflicts with shortcuts
            if (key.name && key.name.length >= 1 && !key.ctrl && !key.meta && !key.name.startsWith('f') &&
                !['up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'delete', 'insert'].includes(key.name)) {
                setForm((prev) => {
                    const fieldMap = { url: 'baseUrl', username: 'username', password: 'password' } as const;
                    const fieldKey = fieldMap[currentField];
                    // Filter out control characters (keep printable ASCII and unicode)
                    const cleanInput = key.name.replace(/[\x00-\x1F\x7F]/g, '');
                    return { ...prev, [fieldKey]: prev[fieldKey] + cleanInput };
                });
                return;
            }

            return;
        }

        // Menu view (default)
        if (view === 'menu') {
            // Quit
            if (key.name === 'q' || key.name === 'Q' || key.name === 'escape') {
                process.exit(0);
            }

            // Navigation
            if (key.name === 'up' || key.name === 'k') {
                setSelectedIndex((prev) => Math.max(0, prev - 1));
                return;
            }
            if (key.name === 'down' || key.name === 'j') {
                setSelectedIndex((prev) => Math.min(tools.length - 1, prev + 1));
                return;
            }

            // Number selection
            if (['1', '2', '3'].includes(key.name)) {
                const idx = parseInt(key.name, 10) - 1;
                if (idx < tools.length) {
                    setSelectedIndex(idx);
                    setSelectedTool(tools[idx]);
                    setView('credentials');
                }
                return;
            }

            // Enter to select
            if (key.name === 'return') {
                if (tools.length > 0) {
                    setSelectedTool(tools[selectedIndex]);
                    setView('credentials');
                }
                return;
            }
        }
    }, [view, tools, selectedIndex, selectedTool, form, currentField]);

    useKeyboard(handleKeyboard);

    // Get shortcuts based on current view
    const getShortcuts = () => {
        switch (view) {
            case 'menu':
                return [
                    { key: '↑/k', label: 'Up' },
                    { key: '↓/j', label: 'Down' },
                    { key: 'Enter', label: 'Select' },
                    { key: 'q', label: 'Quit' },
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
                    <ToolMenu tools={tools} selectedIndex={selectedIndex} />
                )}

                {view === 'credentials' && selectedTool && (
                    <CredentialsPanel
                        toolName={selectedTool.name}
                        form={form}
                        currentField={currentField}
                    />
                )}

                {view === 'confirm' && selectedTool && (
                    <ConfirmPanel
                        toolName={selectedTool.name}
                        configPath={getConfigPath(selectedTool.id)}
                        form={form}
                    />
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
