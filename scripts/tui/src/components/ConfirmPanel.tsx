/**
 * @file components/ConfirmPanel.tsx
 * @description Confirmation panel before config injection
 */

import { colors } from '../theme.ts';
import type { CredentialsForm } from '../types.ts';

interface ConfirmPanelProps {
    toolName: string;
    configPath: string;
    form: CredentialsForm;
}

/** Confirmation panel */
export function ConfirmPanel({ toolName, configPath, form }: ConfirmPanelProps) {
    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: colors.border.normal,
            flexGrow: 1,
            padding: 1,
        }}>
            <text fg={colors.fg.primary} bold>Confirm Configuration</text>
            <text> </text>

            <text>
                <span fg={colors.fg.muted}>Tool:     </span>
                <span fg={colors.fg.primary}>{toolName}</span>
            </text>
            <text>
                <span fg={colors.fg.muted}>URL:      </span>
                <span fg={colors.fg.primary}>{form.baseUrl}</span>
            </text>
            <text>
                <span fg={colors.fg.muted}>User:     </span>
                <span fg={colors.fg.primary}>{form.username}</span>
            </text>
            <text>
                <span fg={colors.fg.muted}>Config:   </span>
                <span fg={colors.fg.secondary}>{configPath}</span>
            </text>

            <text> </text>
            <box style={{ backgroundColor: colors.bg.tertiary, padding: 1 }}>
                <text fg={colors.status.warning}>
                    ⚠ This will merge with your existing config.
                </text>
            </box>
            <text fg={colors.fg.muted}>A backup will be created automatically.</text>

            <text> </text>
            <text>
                <span fg={colors.accent.primary}>Press Y to proceed, N to cancel</span>
            </text>
        </box>
    );
}
