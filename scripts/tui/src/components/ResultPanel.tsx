/**
 * @file components/ResultPanel.tsx
 * @description Result panel for batch installation results
 * Displays summary and per-tool results with status indicators
 */

import { memo } from 'react';
import { colors, statusIndicators } from '../theme.js';
import type { SupportedTool } from '../types.js';
import type { InstallResult } from '../batch-installer.js';

interface SingleResultProps {
    success: boolean;
    tool: SupportedTool;
    toolName: string;
    configPath: string;
    backupName: string | null;
    errorMessage?: string;
}

interface BatchResultProps {
    results: InstallResult[];
}

const nextSteps: Record<string, string> = {
    'claude-desktop': 'Restart Claude Desktop app',
    'claude-code': "Run 'claude mcp list' to verify",
    'opencode': 'Restart OpenCode to load MCP',
};

/** Single tool result panel (legacy) */
export function ResultPanel({ success, tool, toolName, configPath, backupName, errorMessage }: SingleResultProps) {
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
                    <text fg={colors.accent.primary}>Next: {nextSteps[tool] || 'Restart your AI tool'}</text>
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

/** Batch installation results panel */
export const BatchResultPanel = memo(function BatchResultPanel({ results }: BatchResultProps) {
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const withFallback = results.filter(r => r.scopeFallback);
    const allFailed = succeeded.length === 0;
    const allSucceeded = failed.length === 0;

    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: allSucceeded ? colors.status.success : allFailed ? colors.status.error : colors.border.normal,
            flexGrow: 1,
            padding: 1,
        }}>
            {/* Header */}
            <text fg={allSucceeded ? colors.status.success : allFailed ? colors.status.error : colors.fg.primary} bold>
                {allSucceeded ? `${statusIndicators.done.icon} Installation Complete!` :
                  allFailed ? `${statusIndicators.error.icon} Installation Failed` :
                  `${statusIndicators.warning.icon} Installation Partially Complete`}
            </text>
            <text> </text>

            {/* Summary */}
            <box style={{ flexDirection: 'column', paddingLeft: 2 }} gap={1}>
                <text fg={colors.status.success}>
                    {statusIndicators.done.icon} {succeeded.length} succeeded
                </text>
                {failed.length > 0 && (
                    <text fg={colors.status.error}>
                        {statusIndicators.error.icon} {failed.length} failed
                    </text>
                )}
                {withFallback.length > 0 && (
                    <text fg={colors.status.warning}>
                        {statusIndicators.warning.icon} {withFallback.length} used fallback scope
                    </text>
                )}
            </box>

            <text> </text>

            {/* Individual results */}
            <text fg={colors.fg.primary} bold>Tool Results:</text>
            <text> </text>

            <box style={{ flexDirection: 'column', paddingLeft: 2 }} gap={1}>
                {results.map(r => (
                    <box key={r.toolId} style={{ flexDirection: 'column' }} gap={1}>
                        <box gap={1}>
                            <text fg={r.success ? colors.status.success : colors.status.error}>
                                {r.success ? statusIndicators.done.icon : statusIndicators.error.icon}
                            </text>
                            <text fg={colors.fg.secondary}>{r.toolName}</text>
                            {r.scopeFallback && (
                                <text fg={colors.status.warning}>(fallback to {r.actualScope})</text>
                            )}
                        </box>

                        {/* Show details for succeeded */}
                        {r.success && r.configPath && (
                            <text fg={colors.fg.muted} paddingLeft={3}>
                                Config: {r.configPath}
                            </text>
                        )}

                        {/* Show error for failed */}
                        {!r.success && r.errorMessage && (
                            <text fg={colors.status.error} paddingLeft={3}>
                                Error: {r.errorMessage}
                            </text>
                        )}
                    </box>
                ))}
            </box>

            <text> </text>

            {/* Next steps for successful installations */}
            {succeeded.length > 0 && (
                <>
                    <text fg={colors.fg.primary} bold>Next Steps:</text>
                    <text> </text>
                    <box style={{ flexDirection: 'column', paddingLeft: 2 }} gap={1}>
                        {succeeded.map(r => (
                            <text key={r.toolId} fg={colors.accent.primary}>
                                • {nextSteps[r.toolId] || `Restart ${r.toolName}`}
                            </text>
                        ))}
                    </box>
                    <text> </text>
                </>
            )}

            <text fg={colors.fg.muted}>Press Q to exit</text>
        </box>
    );
});
