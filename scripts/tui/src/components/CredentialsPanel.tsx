/**
 * @file components/CredentialsPanel.tsx
 * @description Credentials input panel with form fields
 */

import { colors } from '../theme.ts';
import type { CredentialsForm } from '../types.ts';

interface CredentialsPanelProps {
    toolName: string;
    form: CredentialsForm;
    currentField: 'url' | 'username' | 'password';
}

/** Credentials input panel */
export function CredentialsPanel({ toolName, form, currentField }: CredentialsPanelProps) {
    const fields = [
        { key: 'url' as const, label: 'Jira Base URL', value: form.baseUrl, placeholder: 'https://jira.example.com' },
        { key: 'username' as const, label: 'Username', value: form.username, placeholder: 'your-username' },
        { key: 'password' as const, label: 'Password', value: form.password ? '•'.repeat(form.password.length) : '', placeholder: '•••••••••' },
    ];

    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: colors.border.normal,
            flexGrow: 1,
            padding: 1,
        }}>
            <text fg={colors.fg.primary} bold>Configure {toolName}</text>
            <text> </text>
            <text fg={colors.fg.muted}>Enter your Jira credentials:</text>
            <text> </text>

            {fields.map((field) => {
                const isActive = currentField === field.key;
                const hasValue = field.value.length > 0;
                return (
                    <box key={field.key} style={{ marginBottom: 1 }}>
                        <text>
                            <span fg={isActive ? colors.accent.primary : colors.fg.secondary}>
                                {isActive ? '▶ ' : '  '}
                            </span>
                            <span fg={colors.fg.primary}>{field.label}: </span>
                            {/* When active AND empty: show cursor first, then dimmed placeholder */}
                            {isActive && !hasValue && (
                                <>
                                    <span fg={colors.accent.primary}>█</span>
                                    <span fg={colors.fg.muted}> {field.placeholder}</span>
                                </>
                            )}
                            {/* When active AND has value: show value then cursor */}
                            {isActive && hasValue && (
                                <>
                                    <span fg={colors.fg.primary}>{field.value}</span>
                                    <span fg={colors.accent.primary}>█</span>
                                </>
                            )}
                            {/* When not active: show value or placeholder */}
                            {!isActive && (
                                <span fg={hasValue ? colors.fg.primary : colors.fg.muted}>
                                    {field.value || field.placeholder}
                                </span>
                            )}
                        </text>
                    </box>
                );
            })}

            <text> </text>
            <text fg={colors.fg.muted}>Press Enter to proceed, Esc to go back</text>
        </box>
    );
}
