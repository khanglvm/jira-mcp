/**
 * @file use-keyboard-handlers.ts
 * @description Centralized keyboard handler hook for the installer application
 * Extracted from App.tsx for better maintainability
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { McpRegistry } from '../../../src/mcp-registry.js';
import type { CredentialsForm, DetectionResult, ViewMode } from '../types.js';
import type { InstallResult, InjectionResult } from '../types.js';
import { batchInstall } from '../batch-installer.js';
import { injectConfig } from '../config.js';
import { validateBatchScopes } from '../validation.js';

interface KeyboardHandlerProps {
    view: ViewMode;
    tools: DetectionResult[];
    legacyTools: any[];
    selectedIndex: number;
    multiSelectCursorIndex: number;
    selectedTool: any | null;
    selectedTools: Set<string>;
    selectedScope: 'user' | 'project';
    validationResults: any[];
    form: CredentialsForm;
    currentField: 'url' | 'username' | 'password';
    registry: typeof McpRegistry | null;
    setSelectedIndex: Dispatch<SetStateAction<number>>;
    setMultiSelectCursorIndex: Dispatch<SetStateAction<number>>;
    setSelectedTool: (tool: any) => void;
    setSelectedTools: Dispatch<SetStateAction<Set<string>>>;
    setSelectedScope: Dispatch<SetStateAction<'user' | 'project'>>;
    setValidationResults: (results: any[]) => void;
    setView: (view: ViewMode) => void;
    setForm: Dispatch<SetStateAction<CredentialsForm>>;
    setCurrentField: Dispatch<SetStateAction<'url' | 'username' | 'password'>>;
    setResult: (result: InjectionResult | null) => void;
    setBatchResults: (results: InstallResult[]) => void;
}

/**
 * Centralized keyboard handler with modal priority (early returns)
 */
export function useKeyboardHandlers({
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
}: KeyboardHandlerProps) {
    return useCallback((key: { name: string; shift?: boolean; ctrl?: boolean; meta?: boolean }) => {
        // Result views - only allow quit
        if (['success', 'error', 'results', 'installing'].includes(view)) {
            if (['q', 'Q', 'escape'].includes(key.name)) {
                process.exit(0);
            }
            return;
        }

        // Confirm view
        if (view === 'confirm') {
            if (['y', 'Y'].includes(key.name)) {
                if (selectedTools.size > 1 && registry) {
                    const selectedToolsArray = tools.filter(t => selectedTools.has(t.id));
                    setView('installing');
                    (async () => {
                        const options = selectedToolsArray.map(tool => ({
                            tool,
                            scope: selectedScope,
                            credentials: form,
                            registry,
                        }));
                        const results = await batchInstall(options);
                        setBatchResults(results);
                        setView('results');
                    })();
                } else {
                    const injectionResult = injectConfig(selectedTool!.id, form);
                    setResult(injectionResult);
                    setView(injectionResult.success ? 'success' : 'error');
                }
            } else if (['n', 'N', 'escape'].includes(key.name)) {
                setView('credentials');
            }
            return;
        }

        // Scope selection view
        if (view === 'scope-select') {
            if ([' ', 'space'].includes(key.name)) {
                setSelectedScope(prevScope => prevScope === 'user' ? 'project' : 'user');
                return;
            }
            if (key.name === 'return') {
                setView('credentials');
                return;
            }
            if (key.name === 'escape') {
                setView('multi-select');
                return;
            }
            return;
        }

        // Multi-select view
        if (view === 'multi-select') {
            if (['q', 'Q', 'escape'].includes(key.name)) {
                process.exit(0);
                return;
            }

            // Navigation
            if (['up', 'k'].includes(key.name)) {
                setMultiSelectCursorIndex(prevIndex => Math.max(0, prevIndex - 1));
                return;
            }
            if (['down', 'j'].includes(key.name)) {
                setMultiSelectCursorIndex(prevIndex => Math.min(tools.length - 1, prevIndex + 1));
                return;
            }

            // Toggle selection
            if ([' ', 'space'].includes(key.name)) {
                const tool = tools[multiSelectCursorIndex];
                if (tool) {
                    setSelectedTools(prevSelection => {
                        const newSet = new Set(prevSelection);
                        if (newSet.has(tool.id)) {
                            newSet.delete(tool.id);
                        } else {
                            newSet.add(tool.id);
                        }
                        return newSet;
                    });
                }
                return;
            }

            // Select all/none
            if (key.name === 'a') {
                setSelectedTools(new Set(tools.map(t => t.id)));
                return;
            }
            if (key.name === 'n') {
                setSelectedTools(new Set());
                return;
            }

            // Enter to confirm selection
            if (key.name === 'return') {
                if (selectedTools.size > 0 && registry) {
                    const selectedToolsArray = tools.filter(t => selectedTools.has(t.id));
                    const validations = validateBatchScopes(selectedToolsArray, selectedScope, registry);
                    setValidationResults(validations);
                    setView('scope-select');
                } else if (selectedTools.size === 0) {
                    setView('menu');
                }
                return;
            }
            return;
        }

        // Credentials view
        if (view === 'credentials') {
            const fieldMap = { url: 'baseUrl', username: 'username', password: 'password' } as const;

            // Navigation
            if (['up', 'k'].includes(key.name)) {
                setCurrentField((prev) => {
                    if (prev === 'password') return 'username';
                    if (prev === 'username') return 'url';
                    return prev;
                });
                return;
            }
            if (['down', 'j', 'tab'].includes(key.name)) {
                setCurrentField((prev) => {
                    if (prev === 'url') return 'username';
                    if (prev === 'username') return 'password';
                    return prev;
                });
                return;
            }

            // Enter to proceed
            if (key.name === 'return') {
                if (form.baseUrl && form.username && form.password && /^https?:\/\//.test(form.baseUrl)) {
                    setView('confirm');
                }
                return;
            }

            // Escape to go back
            if (key.name === 'escape') {
                if (selectedTools.size > 0) {
                    setView('scope-select');
                } else {
                    setView('menu');
                    setForm({ baseUrl: '', username: '', password: '' });
                    setCurrentField('url');
                }
                return;
            }

            // Handle text input
            if (key.name === 'backspace') {
                setForm((prev) => {
                    const fieldKey = fieldMap[currentField];
                    return { ...prev, [fieldKey]: prev[fieldKey].slice(0, -1) };
                });
                return;
            }

            // Ctrl+W to delete word
            if (key.ctrl && key.name === 'w') {
                setForm((prev) => {
                    const fieldKey = fieldMap[currentField];
                    const value = prev[fieldKey];
                    const trimmed = value.trimEnd();
                    const lastSpace = trimmed.lastIndexOf(' ');
                    const newValue = lastSpace === -1 ? '' : trimmed.slice(0, lastSpace + 1);
                    return { ...prev, [fieldKey]: newValue };
                });
                return;
            }

            // Ctrl+U to clear line
            if (key.ctrl && key.name === 'u') {
                setForm((prev) => {
                    const fieldKey = fieldMap[currentField];
                    return { ...prev, [fieldKey]: '' };
                });
                return;
            }

            // Character input
            if (key.name && key.name.length >= 1 && !key.ctrl && !key.meta &&
                !['up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'delete', 'insert', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'].includes(key.name)) {
                setForm((prev) => {
                    const fieldKey = fieldMap[currentField];
                    const cleanInput = key.name.replace(/[\x00-\x1F\x7F]/g, '');
                    return { ...prev, [fieldKey]: prev[fieldKey] + cleanInput };
                });
                return;
            }
            return;
        }

        // Menu view (default)
        if (view === 'menu') {
            if (['q', 'Q', 'escape'].includes(key.name)) {
                process.exit(0);
                return;
            }

            // Navigation
            if (['up', 'k'].includes(key.name)) {
                setSelectedIndex((prev) => Math.max(0, prev - 1));
                return;
            }
            if (['down', 'j'].includes(key.name)) {
                setSelectedIndex((prev) => Math.min(legacyTools.length - 1, prev + 1));
                return;
            }

            // Number selection
            const numKey = parseInt(key.name, 10);
            if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
                const idx = numKey - 1;
                if (idx < legacyTools.length) {
                    setSelectedIndex(idx);
                    const tool = legacyTools[idx];
                    setSelectedTool(tool);
                    if (registry) {
                        setSelectedTools(new Set([tool.id]));
                        const validations = validateBatchScopes([tool], selectedScope, registry);
                        setValidationResults(validations);
                        setView('scope-select');
                    } else {
                        setView('credentials');
                    }
                }
                return;
            }

            // M key for multi-select mode
            if (['m', 'M'].includes(key.name)) {
                if (registry && tools.length > 0) {
                    setView('multi-select');
                    setMultiSelectCursorIndex(0);
                }
                return;
            }

            // Enter to select
            if (key.name === 'return') {
                if (legacyTools.length > 0) {
                    const tool = legacyTools[selectedIndex];
                    setSelectedTool(tool);
                    if (registry) {
                        setSelectedTools(new Set([tool.id]));
                        const validations = validateBatchScopes([tool], selectedScope, registry);
                        setValidationResults(validations);
                        setView('scope-select');
                    } else {
                        setView('credentials');
                    }
                }
                return;
            }
        }
    }, [
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
    ]);
}
