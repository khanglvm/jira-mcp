/**
 * @file components/ResultPanel.tsx
 * @description Success/error result panel
 */

import { colors, statusIndicators } from '../theme.ts';
import type { SupportedTool } from '../types.ts';

interface ResultPanelProps {
    success: boolean;
    tool: SupportedTool;
    toolName: string;
    configPath: string;
    backupName: string | null;
    errorMessage?: string;
}

/** Result panel showing success or error */
export function ResultPanel({ success, tool, toolName, configPath, backupName, errorMessage }: ResultPanelProps) {
    const nextSteps: Record<SupportedTool, string> = {
        'claude-desktop': 'Restart Claude Desktop app',
        'claude-code': "Run 'claude mcp list' to verify",
        'opencode': 'Restart OpenCode to load MCP',
    };

    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: success ? colors.status.success : colors.status.error,
            flexGrow: 1,
            padding: 1,
        }}>
            <text fg={success ? colors.status.success : colors.status.error} bold>
                {success ? statusIndicators.done.icon : statusIndicators.error.icon}
                {success ? ' Setup Complete!' : ' Setup Failed'}
            </text>
            <text> </text>

            {success ? (
                <>
                    <text fg={colors.fg.primary}>
                        {statusIndicators.done.icon} Jira MCP configured for {toolName}
                    </text>
                    <text> </text>
                    <text fg={colors.fg.muted}>Config: {configPath}</text>
                    {backupName && (
                        <text fg={colors.fg.muted}>Backup: {backupName}</text>
                    )}
                    <text> </text>
                    <text fg={colors.accent.primary}>Next: {nextSteps[tool]}</text>
                </>
            ) : (
                <>
                    <text fg={colors.status.error}>{errorMessage || 'Unknown error occurred'}</text>
                    <text> </text>
                    <text fg={colors.fg.muted}>Please check your configuration and try again.</text>
                </>
            )}

            <text> </text>
            <text fg={colors.fg.muted}>Press Q to exit</text>
        </box>
    );
}
