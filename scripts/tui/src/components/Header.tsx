/**
 * @file components/Header.tsx
 * @description Fixed header component with app branding
 * Following OpenTUI pattern: fixed height (1 line)
 */

import { colors } from '../theme.ts';

interface HeaderProps {
    title: string;
    version: string;
}

/** Fixed 1-line header with branding */
export function Header({ title, version }: HeaderProps) {
    return (
        <box style={{
            width: '100%',
            height: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: colors.bg.secondary,
        }}>
            <text>
                <span fg={colors.accent.primary}>🔧</span>
                <span fg={colors.accent.primary} bold> {title}</span>
            </text>
            <text fg={colors.fg.muted}>v{version}</text>
        </box>
    );
}
