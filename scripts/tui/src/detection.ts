/**
 * @file detection.ts
 * @description App detection and config path utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { DetectedTool, SupportedTool } from './types.ts';

const home = os.homedir();

/** Config path mapping for each tool */
const CONFIG_PATHS: Record<SupportedTool, string> = {
    'claude-desktop': process.platform === 'darwin'
        ? path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        : process.platform === 'win32'
            ? path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
            : path.join(home, '.config', 'Claude', 'claude_desktop_config.json'),
    'claude-code': path.join(home, '.claude.json'),
    'opencode': path.join(home, '.config', 'opencode', 'opencode.json'),
};

/** Display names for tools */
const TOOL_NAMES: Record<SupportedTool, string> = {
    'claude-desktop': 'Claude Desktop',
    'claude-code': 'Claude Code (CLI)',
    'opencode': 'OpenCode',
};

/** Check if a command exists in PATH */
function commandExists(cmd: string): boolean {
    try {
        execSync(`which ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/** Detect Claude Desktop installation */
function detectClaudeDesktop(): boolean {
    if (process.platform === 'darwin') {
        return fs.existsSync(path.join(home, 'Library', 'Application Support', 'Claude'));
    } else if (process.platform === 'win32') {
        return fs.existsSync(path.join(process.env.APPDATA || '', 'Claude'));
    }
    return fs.existsSync(path.join(home, '.config', 'Claude'));
}

/** Detect Claude Code CLI */
function detectClaudeCode(): boolean {
    return commandExists('claude');
}

/** Detect OpenCode CLI */
function detectOpenCode(): boolean {
    return commandExists('opencode');
}

/** Run detection for all supported tools */
export function detectTools(): DetectedTool[] {
    const detectors: Record<SupportedTool, () => boolean> = {
        'claude-desktop': detectClaudeDesktop,
        'claude-code': detectClaudeCode,
        'opencode': detectOpenCode,
    };

    const tools: DetectedTool[] = [];

    for (const [id, detector] of Object.entries(detectors)) {
        const toolId = id as SupportedTool;
        const detected = detector();

        if (detected) {
            tools.push({
                id: toolId,
                name: TOOL_NAMES[toolId],
                configPath: CONFIG_PATHS[toolId],
                detected: true,
            });
        }
    }

    return tools;
}

/** Get config path for a tool */
export function getConfigPath(tool: SupportedTool): string {
    return CONFIG_PATHS[tool];
}
