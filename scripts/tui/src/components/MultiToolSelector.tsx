/**
 * @file components/MultiToolSelector.tsx
 * @description Multi-select checkbox UI for tool selection (14 tools)
 * Displays all MCP tools with checkbox indicators, keyboard navigation
 */

import { memo } from 'react';
import { colors } from '../theme.js';
import type { DetectionResult } from '../types.js';

interface MultiToolSelectorProps {
    tools: DetectionResult[];
    selectedTools: Set<string>;
    cursorIndex: number;
}

/**
 * Multi-tool selector with checkbox list
 * Features: space toggle, cursor navigation, select all/none
 */
export const MultiToolSelector = memo(function MultiToolSelector({
    tools,
    selectedTools,
    cursorIndex,
}: MultiToolSelectorProps) {
    // Empty state handling
    if (tools.length === 0) {
        return (
            <box style={{
                flexDirection: 'column',
                border: true,
                borderColor: colors.border.normal,
                flexGrow: 1,
                padding: 1,
                alignItems: 'center',
                paddingY: 2,
            }}>
                <text fg={colors.status.warning}>⚠ No AI tools detected</text>
                <text> </text>
                <text fg={colors.fg.muted}>
                    Install Claude Desktop, Claude Code, Cursor, or other supported tools
                </text>
            </box>
        );
    }

    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: colors.border.normal,
            flexGrow: 1,
            padding: 1,
        }}>
            {/* Title */}
            <text fg={colors.fg.primary} bold>Select AI Tools to Configure</text>
            <text> </text>

            {/* Instruction row */}
            <text fg={colors.fg.muted}>
                Space: toggle  Enter: confirm  a: all  n: none
            </text>
            <text> </text>

            {/* Tool list */}
            {tools.map((tool, index) => {
                const isSelected = selectedTools.has(tool.id);
                const isCursor = index === cursorIndex;
                const checkbox = isSelected ? '☑' : '☐';
                const cursor = isCursor ? '▶' : ' ';
                const nameColor = tool.detected ? colors.status.success : colors.fg.muted;
                const statusText = tool.detected ? '(detected)' : '(not available)';
                const statusColor = tool.detected ? colors.fg.muted : colors.status.warning;

                return (
                    <box
                        key={tool.id}
                        style={{
                            backgroundColor: isCursor ? colors.bg.highlight : 'transparent',
                            paddingLeft: 1,
                        }}
                    >
                        <text>
                            <span fg={colors.accent.primary}>{checkbox}</span>
                            <span> </span>
                            <span fg={colors.accent.secondary}>{cursor}</span>
                            <span> </span>
                            <span fg={nameColor}>{tool.displayName}</span>
                            <span> </span>
                            <span fg={statusColor}>{statusText}</span>
                        </text>
                    </box>
                );
            })}

            <text> </text>

            {/* Status row */}
            <box style={{ marginTop: 1 }} gap={2}>
                <text fg={colors.fg.muted}>
                    {selectedTools.size} selected
                </text>
                <text fg={colors.fg.secondary}>
                    a: select all  n: none
                </text>
            </box>

            <text> </text>
            <text fg={colors.fg.muted}>  [q] Quit</text>
        </box>
    );
});
