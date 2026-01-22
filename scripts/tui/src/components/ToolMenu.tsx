/**
 * @file components/ToolMenu.tsx
 * @description Scrollable tool selection menu with keyboard navigation
 * Following OpenTUI pattern: scrollable list with selection highlight
 */

import { memo } from 'react';
import { colors, statusIndicators } from '../theme.ts';
import type { DetectedTool } from '../types.ts';

interface ToolMenuProps {
    tools: DetectedTool[];
    selectedIndex: number;
}

/** Tool menu with selection indicator */
export const ToolMenu = memo(function ToolMenu({ tools, selectedIndex }: ToolMenuProps) {
    return (
        <box style={{
            flexDirection: 'column',
            border: true,
            borderColor: colors.border.normal,
            flexGrow: 1,
            padding: 1,
        }}>
            <text fg={colors.fg.primary} bold>Select your AI tool:</text>
            <text> </text>

            {tools.length === 0 ? (
                <text fg={colors.status.error}>No supported AI tools detected.</text>
            ) : (
                tools.map((tool, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                        <box
                            key={tool.id}
                            style={{
                                backgroundColor: isSelected ? colors.bg.highlight : 'transparent',
                                paddingLeft: 1,
                            }}
                        >
                            <text>
                                <span fg={isSelected ? colors.accent.primary : colors.fg.muted}>
                                    {isSelected ? statusIndicators.selected.icon : ' '}
                                </span>
                                <span fg={isSelected ? colors.accent.primary : colors.fg.primary}>
                                    {' '}[{index + 1}] {tool.name}
                                </span>
                            </text>
                        </box>
                    );
                })
            )}

            <text> </text>
            <text fg={colors.fg.muted}>  [q] Quit</text>
        </box>
    );
});
