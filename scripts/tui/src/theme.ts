/**
 * @file theme.ts
 * @description Tokyo Night inspired theme for Jira MCP Installer
 * Following OpenTUI theming patterns from ralph-tui guide
 */

/** Background layers (progression for depth) */
export const colors = {
    bg: {
        primary: '#1a1b26',    // Main background
        secondary: '#24283b',  // Panels, cards
        tertiary: '#2f3449',   // Nested elements
        highlight: '#3d4259'   // Selection, hover
    },

    /** Foreground hierarchy */
    fg: {
        primary: '#c0caf5',    // Main text
        secondary: '#a9b1d6',  // Secondary text
        muted: '#565f89',      // Labels, hints
        dim: '#414868'         // Disabled, borders
    },

    /** Semantic status colors */
    status: {
        success: '#9ece6a',    // Green
        warning: '#e0af68',    // Yellow
        error: '#f7768e',      // Red
        info: '#7aa2f7'        // Blue
    },

    /** Accent colors for interactive elements */
    accent: {
        primary: '#7aa2f7',    // Links, primary actions
        secondary: '#bb9af7',  // Secondary actions
        tertiary: '#7dcfff'    // Highlights
    },

    /** Border colors */
    border: {
        normal: '#3d4259',
        active: '#7aa2f7',
        muted: '#2f3449'
    }
} as const;

/** Status indicators - Unicode symbols with colors */
export const statusIndicators = {
    done: { icon: '✓', color: colors.status.success },
    active: { icon: '▶', color: colors.accent.primary },
    pending: { icon: '○', color: colors.fg.muted },
    selected: { icon: '▶', color: colors.accent.primary },
    error: { icon: '✗', color: colors.status.error },
    warning: { icon: '⚠', color: colors.status.warning },
} as const;

/** Layout constants for fixed-flexible design */
export const layout = {
    header: { height: 1 },
    footer: { height: 3 },
    panel: { minWidth: 50, maxWidth: 60 },
    padding: { horizontal: 2, vertical: 1 }
} as const;

/** Get status display from status type */
export function getStatusDisplay(status: keyof typeof statusIndicators) {
    return statusIndicators[status] || statusIndicators.pending;
}
