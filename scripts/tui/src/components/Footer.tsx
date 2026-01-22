/**
 * @file components/Footer.tsx
 * @description Fixed footer with keyboard shortcuts
 * Following OpenTUI pattern: fixed height (2 lines)
 */

import { colors } from '../theme.ts';

interface Shortcut {
    key: string;
    label: string;
}

interface FooterProps {
    shortcuts: Shortcut[];
}

/** Fixed 2-line footer with shortcuts */
export function Footer({ shortcuts }: FooterProps) {
    return (
        <box style={{
            width: '100%',
            height: 2,
            border: true,
            borderColor: colors.border.normal,
            paddingLeft: 1,
            backgroundColor: colors.bg.secondary,
        }}>
            <text fg={colors.fg.muted}>
                {shortcuts.map((s, i) => (
                    <span key={s.key}>
                        <span fg={colors.accent.primary}>{s.key}</span>
                        <span fg={colors.fg.muted}>:{s.label}</span>
                        {i < shortcuts.length - 1 && <span>  </span>}
                    </span>
                ))}
            </text>
        </box>
    );
}
