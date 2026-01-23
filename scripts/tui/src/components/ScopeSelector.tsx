/**
 * @file components/ScopeSelector.tsx
 * @description Installation scope selector with validation warnings
 * Displays radio buttons for user/global vs project scope with compatibility warnings
 */

import { memo } from 'react';
import { colors } from '../theme.js';
import type { ScopeValidationResult } from '../validation.js';

interface ScopeSelectorProps {
    selectedScope: 'user' | 'project';
    validationResults: ScopeValidationResult[];
}

/**
 * Scope selector with radio buttons and validation warnings
 * Shows which tools don't support the selected scope
 */
export const ScopeSelector = memo(function ScopeSelector({
    selectedScope,
    validationResults,
}: ScopeSelectorProps) {
    // Filter for incompatible tools that have warnings
    const warnings = validationResults.filter(r => !r.isCompatible);

    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: colors.border.normal,
            flexGrow: 1,
            padding: 1,
        }}>
            {/* Title */}
            <text fg={colors.fg.primary} bold>Installation Scope</text>
            <text> </text>

            {/* Radio buttons */}
            <box style={{ flexDirection: 'column', paddingLeft: 2 }} gap={1}>
                {/* User/Global scope option */}
                <box gap={1}>
                    <text fg={colors.accent.primary}>
                        {selectedScope === 'user' ? '(•)' : '( )'}
                    </text>
                    <text fg={colors.fg.secondary}>User/Global (default)</text>
                </box>
                <text fg={colors.fg.muted} paddingLeft={4}>
                    ~/.claude.json, ~/Library/.../Claude/...
                </text>

                <text> </text>

                {/* Project scope option */}
                <box gap={1}>
                    <text fg={colors.accent.primary}>
                        {selectedScope === 'project' ? '(•)' : '( )'}
                    </text>
                    <text fg={colors.fg.secondary}>Project-level</text>
                </box>
                <text fg={colors.fg.muted} paddingLeft={4}>
                    .mcp.json, .cursor/mcp.json, etc.
                </text>
            </box>

            {/* Warning list for incompatible tools */}
            {warnings.length > 0 && (
                <>
                    <text> </text>
                    <box style={{ flexDirection: 'column', paddingLeft: 2 }}>
                        <text fg={colors.status.warning} bold>⚠ Scope Warnings:</text>
                        {warnings.map(w => (
                            <text key={w.toolId} fg={colors.status.warning}>
                                • {w.warningMessage}
                            </text>
                        ))}
                    </box>
                </>
            )}

            <text> </text>

            {/* Keyboard hint */}
            <text fg={colors.fg.muted}>
                Space: toggle  Enter: confirm
            </text>
        </box>
    );
});
