#!/usr/bin/env node
/**
 * @file installer.mjs
 * @description Pure JavaScript interactive installer for Jira MCP
 * Zero dependencies on build step - runs directly with Node.js
 * 
 * Usage:
 *   node scripts/installer.mjs
 *   bash <(curl -fsSL https://...install.sh) - downloads and runs this
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as https from 'https';
import * as readline from 'readline';
import { execSync } from 'child_process';

// =============================================================================
// ANSI COLORS (Tokyo Night theme)
// =============================================================================

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground
    fg: {
        primary: '\x1b[38;5;153m',   // Light blue
        secondary: '\x1b[38;5;146m', // Muted purple-blue
        muted: '\x1b[38;5;60m',      // Dark muted
    },

    // Status colors
    success: '\x1b[38;5;114m',  // Green
    warning: '\x1b[38;5;221m',  // Yellow
    error: '\x1b[38;5;204m',    // Red/pink
    accent: '\x1b[38;5;75m',    // Bright blue

    // Background
    bg: {
        highlight: '\x1b[48;5;236m', // Dark gray highlight
    }
};

/** Helper to colorize text */
const c = {
    reset: (s) => `${colors.reset}${s}`,
    bold: (s) => `${colors.bold}${s}${colors.reset}`,
    dim: (s) => `${colors.dim}${s}${colors.reset}`,
    primary: (s) => `${colors.fg.primary}${s}${colors.reset}`,
    muted: (s) => `${colors.fg.muted}${s}${colors.reset}`,
    success: (s) => `${colors.success}${s}${colors.reset}`,
    warning: (s) => `${colors.warning}${s}${colors.reset}`,
    error: (s) => `${colors.error}${s}${colors.reset}`,
    accent: (s) => `${colors.accent}${s}${colors.reset}`,
};

// =============================================================================
// TOOL DETECTION
// =============================================================================

/**
 * Map Node.js platform to config schema platform key
 */
function mapPlatform(platform) {
    return platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';
}

/**
 * Resolve platform-specific path with environment variable expansion
 */
function resolvePlatformPath(pathStr) {
    let resolved = pathStr;
    resolved = resolved.replace(/^~/, os.homedir());
    resolved = resolved.replace(/\$HOME|%HOME%/gi, os.homedir());

    if (process.platform === 'win32') {
        resolved = resolved.replace(/%APPDATA%/gi, process.env.APPDATA || '');
        resolved = resolved.replace(/%USERPROFILE%/gi, process.env.USERPROFILE || '');
        resolved = resolved.replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || '');
    } else {
        resolved = resolved.replace(/\$([A-Z_]+)/gi, (_, name) => process.env[name] || '');
    }
    return resolved;
}

/**
 * Check if a CLI command exists
 */
function checkCommand(cmd) {
    try {
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';
        execSync(`${whichCmd} ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a path exists
 */
function checkPath(pathStr) {
    try {
        const resolved = resolvePlatformPath(pathStr);
        return fs.existsSync(resolved);
    } catch {
        return false;
    }
}

/**
 * Tool definitions with detection strategies
 * Each tool has: id, name, configPaths (per platform), cli command
 */
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/khanglvm/aic/main/mcp/mcp-conf.json';

/**
 * Fetch remote MCP configuration
 */
async function fetchMcpConfig() {
    return new Promise((resolve) => {
        https.get(REMOTE_CONFIG_URL, (res) => {
            if (res.statusCode !== 200) {
                resolve(null);
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

/**
 * Default tool definitions (fallback)
 */
let TOOLS = [
    {
        id: 'claude-desktop',
        name: 'Claude Desktop',
        configPaths: {
            macos: '~/Library/Application Support/Claude/claude_desktop_config.json',
            windows: '%APPDATA%\\Claude\\claude_desktop_config.json',
            linux: '~/.config/Claude/claude_desktop_config.json',
        },
        cli: null,
        configFormat: 'claude', // mcpServers wrapper
    },
    {
        id: 'claude-code',
        name: 'Claude Code (CLI)',
        configPaths: {
            macos: '~/.claude.json',
            windows: '%USERPROFILE%\\.claude.json',
            linux: '~/.claude.json',
        },
        cli: 'claude',
        configFormat: 'claude', // mcpServers wrapper
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        configPaths: {
            macos: '~/.config/opencode/oh-my-opencode.json',
            windows: '%APPDATA%\\opencode\\oh-my-opencode.json',
            linux: '~/.config/opencode/oh-my-opencode.json',
        },
        cli: 'opencode',
        configFormat: 'opencode', // mcp wrapper
    },
    {
        id: 'cursor',
        name: 'Cursor',
        configPaths: {
            macos: '~/.cursor/mcp.json',
            windows: '%USERPROFILE%\\.cursor\\mcp.json',
            linux: '~/.cursor/mcp.json',
        },
        cli: null,
        configFormat: 'claude',
    },
    {
        id: 'windsurf',
        name: 'Windsurf',
        configPaths: {
            macos: '~/.codeium/windsurf/mcp_config.json',
            windows: '%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json',
            linux: '~/.codeium/windsurf/mcp_config.json',
        },
        cli: null,
        configFormat: 'claude',
    },
];

/**
 * Merge remote config into TOOLS list
 */
function mergeTools(remoteConfig) {
    if (!remoteConfig || !remoteConfig.clients) return;

    const mergedTools = [];
    const seenIds = new Set();

    // Helper to determine format
    const getFormat = (client) => {
        const key = client.configFormat?.wrapperKey;
        if (key === 'mcp') return 'opencode';
        if (key === 'servers') return 'vscode';
        if (key === 'context_servers') return 'zed';
        return 'claude'; // default to mcpServers
    };

    Object.entries(remoteConfig.clients).forEach(([id, client]) => {
        seenIds.add(id);

        // Map config locations
        const configPaths = {
            macos: client.configLocations?.macos?.global || client.configLocations?.macos?.default,
            windows: client.configLocations?.windows?.global || client.configLocations?.windows?.default,
            linux: client.configLocations?.linux?.global || client.configLocations?.linux?.default,
        };

        mergedTools.push({
            id,
            name: client.name,
            configPaths,
            // Keep existing CLI check if we have it locally, otherwise null
            cli: TOOLS.find(t => t.id === id)?.cli || null,
            configFormat: getFormat(client),
            wrapperKey: client.configFormat?.wrapperKey || 'mcpServers' // Store specific key
        });
    });

    TOOLS = mergedTools;
}

/**
 * Detect available tools on the current platform
 */
function detectTools() {
    const platform = mapPlatform(process.platform);
    const results = [];

    for (const tool of TOOLS) {
        const configPath = tool.configPaths[platform];
        if (!configPath) continue;

        const resolvedPath = resolvePlatformPath(configPath);
        const hasConfig = checkPath(configPath);
        const hasCli = tool.cli ? checkCommand(tool.cli) : false;
        const detected = hasConfig || hasCli;

        results.push({
            ...tool,
            configPath: resolvedPath,
            detected,
            detectionMethod: hasCli ? 'cli' : hasConfig ? 'config' : 'none',
        });
    }

    return results;
}

// =============================================================================
// CONFIG INJECTION
// =============================================================================

const PACKAGE_NAME = '@khanglvm/jira-mcp';

/**
 * Create Jira MCP server config for Claude-style tools
 */
function createClaudeConfig(creds) {
    return {
        command: 'npx',
        args: ['-y', PACKAGE_NAME],
        env: {
            JIRA_BASE_URL: creds.baseUrl,
            JIRA_USERNAME: creds.username,
            JIRA_PASSWORD: creds.password,
        },
    };
}

/**
 * Create Jira MCP server config for OpenCode
 */
function createOpenCodeConfig(creds) {
    return {
        type: 'local',
        command: ['npx', '-y', PACKAGE_NAME],
        environment: {
            JIRA_BASE_URL: creds.baseUrl,
            JIRA_USERNAME: creds.username,
            JIRA_PASSWORD: creds.password,
        },
    };
}

/**
 * Read existing config file or return empty object
 */
function readConfig(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
    } catch {
        // Return empty on parse error
    }
    return {};
}

/**
 * Ensure directory exists for config file
 */
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Create backup of existing config
 */
function createBackup(filePath) {
    if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        return path.basename(backupPath);
    }
    return null;
}

/**
 * Inject Jira MCP config into tool's config file
 */
function injectConfig(tool, creds) {
    const configPath = tool.configPath;

    try {
        // Create backup
        const backupName = createBackup(configPath);

        // Read existing config
        const config = readConfig(configPath);

        // Get wrapper key
        const wrapperKey = tool.wrapperKey || (tool.configFormat === 'opencode' ? 'mcp' : 'mcpServers');

        // Ensure wrapper key exists
        if (!config[wrapperKey]) {
            config[wrapperKey] = {};
        }

        // Add jira server config based on format
        let serverConfig;
        switch (tool.configFormat) {
            case 'opencode':
                serverConfig = createOpenCodeConfig(creds);
                break;
            case 'vscode':
                serverConfig = {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', PACKAGE_NAME],
                    env: {
                        JIRA_BASE_URL: creds.baseUrl,
                        JIRA_USERNAME: creds.username,
                        JIRA_PASSWORD: creds.password,
                    }
                };
                break;
            case 'zed':
                serverConfig = {
                    command: 'npx',
                    args: ['-y', PACKAGE_NAME],
                    env: {
                        JIRA_BASE_URL: creds.baseUrl,
                        JIRA_USERNAME: creds.username,
                        JIRA_PASSWORD: creds.password,
                    }
                };
                break;
            default: // claude / standard
                serverConfig = createClaudeConfig(creds);
        }

        config[wrapperKey]['jira'] = serverConfig;

        // Ensure directory and write
        ensureDir(configPath);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

        return {
            success: true,
            backupName,
            message: `Configured Jira MCP for ${tool.name}`,
        };
    } catch (error) {
        return {
            success: false,
            backupName: null,
            message: `Failed: ${error.message}`,
        };
    }
}

// =============================================================================
// INTERACTIVE PROMPTS (Pure Node.js readline)
// =============================================================================

/**
 * Create readline interface with raw mode for single-key input
 */
function createRl() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

/**
 * Move cursor up N lines
 */
function moveCursorUp(count) {
    if (count > 0) {
        process.stdout.write(`\x1b[${count}A`);
    }
}

/**
 * Move cursor to beginning of line
 */
function moveCursorToStart() {
    process.stdout.write('\r');
}

/**
 * Clear from cursor to end of screen
 */
function clearToEnd() {
    process.stdout.write('\x1b[J');
}

/**
 * Hide cursor
 */
function hideCursor() {
    process.stdout.write('\x1b[?25l');
}

/**
 * Show cursor
 */
function showCursor() {
    process.stdout.write('\x1b[?25h');
}

/**
 * Read clipboard content (for paste support)
 */
function readClipboard() {
    try {
        if (process.platform === 'darwin') {
            return execSync('pbpaste', { encoding: 'utf-8' }).trim();
        } else if (process.platform === 'linux') {
            // Try xclip first, then xsel
            try {
                return execSync('xclip -selection clipboard -o', { encoding: 'utf-8' }).trim();
            } catch {
                return execSync('xsel --clipboard --output', { encoding: 'utf-8' }).trim();
            }
        } else if (process.platform === 'win32') {
            return execSync('powershell -command "Get-Clipboard"', { encoding: 'utf-8' }).trim();
        }
    } catch {
        return '';
    }
    return '';
}

/**
 * Text input prompt with proper backspace handling
 */
async function promptInput(message, options = {}) {
    const { defaultValue = '' } = options;

    return new Promise((resolve) => {
        const prompt = `${c.accent('▶')} ${message}: `;
        process.stdout.write(prompt);
        if (defaultValue) {
            process.stdout.write(defaultValue);
        }

        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;

        if (stdin.isTTY) {
            stdin.setRawMode(true);
        }
        stdin.resume();

        let value = defaultValue;

        const onData = (char) => {
            const charStr = char.toString('utf8');

            switch (charStr) {
                case '\n':
                case '\r':
                case '\u0004': // Ctrl+D
                    stdin.removeListener('data', onData);
                    if (stdin.isTTY) {
                        stdin.setRawMode(wasRaw);
                    }
                    stdin.pause();
                    process.stdout.write('\n');
                    resolve(value);
                    break;
                case '\u0003': // Ctrl+C
                    process.exit(0);
                    break;
                case '\u007F': // Backspace
                case '\b':
                    if (value.length > 0) {
                        value = value.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    break;
                case '\u0016': // Ctrl+V (paste)
                    const clipboard = readClipboard();
                    if (clipboard) {
                        value += clipboard;
                        process.stdout.write(clipboard);
                    }
                    break;
                default:
                    // Printable characters
                    if (charStr.length === 1 && charStr.charCodeAt(0) >= 32) {
                        value += charStr;
                        process.stdout.write(charStr);
                    }
                    break;
            }
        };

        stdin.on('data', onData);
    });
}

/**
 * Password input with masking
 */
async function promptPassword(message) {
    return new Promise((resolve) => {
        const prompt = `${c.accent('▶')} ${message}: `;
        process.stdout.write(prompt);

        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;

        if (stdin.isTTY) {
            stdin.setRawMode(true);
        }
        stdin.resume();

        let password = '';

        const onData = (char) => {
            const charStr = char.toString('utf8');

            switch (charStr) {
                case '\n':
                case '\r':
                case '\u0004': // Ctrl+D
                    stdin.removeListener('data', onData);
                    if (stdin.isTTY) {
                        stdin.setRawMode(wasRaw);
                    }
                    stdin.pause();
                    process.stdout.write('\n');
                    resolve(password);
                    break;
                case '\u0003': // Ctrl+C
                    process.exit(0);
                    break;
                case '\u007F': // Backspace
                case '\b':
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    break;
                case '\u0016': // Ctrl+V (paste)
                    const clipboard = readClipboard();
                    if (clipboard) {
                        password += clipboard;
                        process.stdout.write('•'.repeat(clipboard.length));
                    }
                    break;
                default:
                    // Printable characters
                    if (charStr.length === 1 && charStr.charCodeAt(0) >= 32) {
                        password += charStr;
                        process.stdout.write('•');
                    }
                    break;
            }
        };

        stdin.on('data', onData);
    });
}

/**
 * Confirm prompt (Y/N)
 */
async function promptConfirm(message, defaultValue = true) {
    const rl = createRl();
    const hint = defaultValue ? '[Y/n]' : '[y/N]';

    return new Promise((resolve) => {
        rl.question(`${c.accent('?')} ${message} ${c.muted(hint)} `, (answer) => {
            rl.close();
            const normalized = answer.toLowerCase().trim();
            if (normalized === '') {
                resolve(defaultValue);
            } else {
                resolve(normalized === 'y' || normalized === 'yes');
            }
        });
    });
}

/**
 * Multi-select checkbox prompt
 */
async function promptMultiSelect(message, choices) {
    return new Promise((resolve) => {
        const selected = new Set();
        let cursor = 0;
        let isFirstRender = true;

        // Total lines rendered: 1 (message) + 1 (empty) + choices.length + 1 (empty) + 1 (status) = choices.length + 4
        const totalLines = choices.length + 4;

        // Pre-select detected tools
        choices.forEach((choice, i) => {
            if (choice.detected) {
                selected.add(i);
            }
        });

        const render = () => {
            // On re-render: move cursor up to start of our block, then clear to end
            if (!isFirstRender) {
                moveCursorUp(totalLines);
                moveCursorToStart();
                clearToEnd();
            }
            isFirstRender = false;

            console.log(`${c.accent('?')} ${c.bold(message)} ${c.muted('(Space to toggle, Enter to confirm)')}`);
            console.log();

            choices.forEach((choice, i) => {
                const isSelected = selected.has(i);
                const isCursor = i === cursor;
                const checkbox = isSelected ? c.success('☑') : c.muted('☐');
                const pointer = isCursor ? c.accent('▶') : ' ';
                const label = choice.detected
                    ? `${choice.name} ${c.success('(detected)')}`
                    : `${choice.name} ${c.muted('(not found)')}`;
                const bg = isCursor ? colors.bg.highlight : '';

                console.log(`${bg}${pointer} ${checkbox} ${label}${colors.reset}`);
            });

            console.log();
            console.log(c.muted(`  ${selected.size} selected  |  a: all  n: none  q: quit`));
        };

        hideCursor();
        render();

        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        const cleanup = () => {
            stdin.setRawMode(false);
            stdin.removeAllListeners('data');
            showCursor();
        };

        stdin.on('data', (key) => {
            switch (key) {
                case '\u001b[A': // Up arrow
                case 'k':
                    cursor = Math.max(0, cursor - 1);
                    render();
                    break;
                case '\u001b[B': // Down arrow
                case 'j':
                    cursor = Math.min(choices.length - 1, cursor + 1);
                    render();
                    break;
                case ' ': // Space - toggle
                    if (selected.has(cursor)) {
                        selected.delete(cursor);
                    } else {
                        selected.add(cursor);
                    }
                    render();
                    break;
                case 'a': // Select all
                    choices.forEach((_, i) => selected.add(i));
                    render();
                    break;
                case 'n': // Select none
                    selected.clear();
                    render();
                    break;
                case '\r': // Enter - confirm
                case '\n':
                    cleanup();
                    const result = choices.filter((_, i) => selected.has(i));
                    resolve(result);
                    break;
                case 'q':
                case '\u0003': // Ctrl+C
                    cleanup();
                    process.exit(0);
                    break;
            }
        });
    });
}

/**
 * Single select prompt
 */
async function promptSelect(message, choices) {
    return new Promise((resolve) => {
        let cursor = 0;
        let isFirstRender = true;

        const render = () => {
            // On re-render: move cursor up to start of our block, then clear to end
            if (!isFirstRender) {
                moveCursorUp(choices.length + 2);
                moveCursorToStart();
                clearToEnd();
            }
            isFirstRender = false;

            console.log(`${c.accent('?')} ${c.bold(message)}`);
            console.log();

            choices.forEach((choice, i) => {
                const isCursor = i === cursor;
                const pointer = isCursor ? c.accent('▶') : ' ';
                const label = isCursor ? c.accent(choice.label) : choice.label;
                const bg = isCursor ? colors.bg.highlight : '';

                console.log(`${bg}${pointer} ${label}${colors.reset}`);
            });
        };

        hideCursor();
        render();

        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        const cleanup = () => {
            stdin.setRawMode(false);
            stdin.removeAllListeners('data');
            showCursor();
        };

        stdin.on('data', (key) => {
            switch (key) {
                case '\u001b[A': // Up arrow
                case 'k':
                    cursor = Math.max(0, cursor - 1);
                    render();
                    break;
                case '\u001b[B': // Down arrow
                case 'j':
                    cursor = Math.min(choices.length - 1, cursor + 1);
                    render();
                    break;
                case '\r':
                case '\n':
                    cleanup();
                    resolve(choices[cursor]);
                    break;
                case 'q':
                case '\u0003':
                    cleanup();
                    process.exit(0);
                    break;
            }
        });
    });
}

// =============================================================================
// MAIN INSTALLER FLOW
// =============================================================================

async function main() {
    console.clear();
    console.log(c.dim('  Initializing...'));

    // Fetch dynamic tools config
    const remoteConfig = await fetchMcpConfig();
    if (remoteConfig) {
        mergeTools(remoteConfig);
    }

    // Step 1: Detect tools
    const allTools = detectTools();
    const detectedTools = allTools.filter(t => t.detected);

    if (detectedTools.length === 0) {
        console.log();
        console.log(c.warning('  ⚠ No AI tools detected on this system.'));
        console.log();
        process.exit(1);
    }

    // Step 2: Select tools to configure (only show detected tools)
    const selectedTools = await promptMultiSelect(
        'Select tools to configure (all selected by default):',
        detectedTools.map(t => ({
            ...t,
            label: t.name,
        }))
    );

    if (selectedTools.length === 0) {
        console.log();
        console.log(c.warning('  No tools selected. Exiting.'));
        process.exit(0);
    }

    // Clear screen and show selected tools
    console.clear();
    console.log();
    console.log(c.bold('  Jira MCP will be installed to:'));
    for (const tool of selectedTools) {
        console.log(c.success(`    • ${tool.name}`));
    }
    console.log();

    // Step 3: Get Jira credentials
    console.log(c.bold('  Enter your Jira credentials:'));
    console.log();

    // Check for pre-filled URL from environment - if valid, skip URL input
    const prefillUrl = process.env.JIRA_MCP_URL || '';
    const isValidPrefillUrl = /^https?:\/\//.test(prefillUrl);

    let baseUrl;
    if (isValidPrefillUrl) {
        // Valid URL provided via argument - skip input
        baseUrl = prefillUrl;
        console.log(c.muted('  URL:      ') + baseUrl + c.success(' (from --url)'));
    } else {
        // No valid URL - prompt for input with validation loop
        let urlValid = false;
        while (!urlValid) {
            baseUrl = await promptInput('Jira Base URL');

            if (/^https?:\/\//.test(baseUrl)) {
                urlValid = true;
            } else {
                // Show warning and let user retry
                console.log(c.warning('  ⚠ Invalid URL. Example: https://jira.company.com'));
            }
        }
    }

    // Prompt for username with validation loop - allow re-entry on empty
    let username;
    let usernameValid = false;
    while (!usernameValid) {
        username = await promptInput('Username');
        if (username.trim()) {
            usernameValid = true;
        } else {
            console.log(c.warning('  ⚠ Username is required'));
        }
    }

    // Prompt for password with validation loop - allow re-entry on empty
    let password;
    let passwordValid = false;
    while (!passwordValid) {
        password = await promptPassword('Password');
        if (password) {
            passwordValid = true;
        } else {
            console.log(c.warning('  ⚠ Password is required'));
        }
    }

    const credentials = { baseUrl, username, password };

    console.log();

    // Step 4: Confirmation
    console.log(c.bold('  Configuration Summary:'));
    console.log();
    console.log(c.muted('  Tools:    ') + selectedTools.map(t => t.name).join(', '));
    console.log(c.muted('  URL:      ') + baseUrl);
    console.log(c.muted('  User:     ') + username);
    console.log(c.muted('  Password: ') + '•'.repeat(Math.min(password.length, 12)));
    console.log();
    console.log(c.warning('  ⚠ This will merge with your existing MCP config.'));
    console.log(c.muted('    A backup will be created automatically.'));
    console.log();

    const confirmed = await promptConfirm('Proceed with configuration?', true);

    if (!confirmed) {
        console.log();
        console.log(c.muted('  Cancelled.'));
        process.exit(0);
    }

    console.log();

    // Step 5: Install
    console.log(c.muted('  Installing...'));
    console.log();

    const results = [];
    for (const tool of selectedTools) {
        const result = injectConfig(tool, credentials);
        results.push({ tool, ...result });

        if (result.success) {
            console.log(c.success(`  ✓ ${tool.name}`) + c.muted(` → ${tool.configPath}`));
            if (result.backupName) {
                console.log(c.muted(`    Backup: ${result.backupName}`));
            }
        } else {
            console.log(c.error(`  ✗ ${tool.name}: ${result.message}`));
        }
    }

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log();

    // Step 6: Summary
    if (succeeded.length > 0) {
        console.log(c.success('Installation Complete! Restart your AI tool to load MCP.'));
    }

    if (failed.length > 0) {
        console.log();
        console.log(c.error(`  ${failed.length} tool(s) failed to configure.`));
    }

    console.log();
}

// Run main
main().catch((err) => {
    console.error(c.error(`Error: ${err.message}`));
    process.exit(1);
});
