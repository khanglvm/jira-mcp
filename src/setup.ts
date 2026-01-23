/**
 * @file setup.ts
 * @description CLI setup command for injecting MCP configuration into various AI tools.
 * Dynamically supports all MCP clients from the registry (14 tools).
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRegistry, McpRegistry } from './mcp-registry.js';
import { mapPlatform, resolvePlatformPath } from './utils/path-resolver.js';

/** Supported CLI tools for MCP configuration - all 14 tools from registry */
export type SupportedCli =
    | 'claude-code'
    | 'claude-desktop'
    | 'github-copilot'
    | 'cursor'
    | 'windsurf'
    | 'roo-code'
    | 'zed'
    | 'factory-droid'
    | 'antigravity'
    | 'gemini-cli'
    | 'opencode'
    | 'vscode-copilot'
    | 'jetbrains-copilot'
    | 'codex-cli';

/** Configuration scope - user-level or project-level */
export type ConfigScope = 'user' | 'project';

/** Setup options from CLI arguments */
export interface SetupOptions {
    cli: SupportedCli;
    baseUrl: string;
    username: string;
    password: string;
    scope: ConfigScope;
}

/** MCP server configuration block */
interface McpServerConfig {
    command: string;
    args: string[];
    env: Record<string, string>;
}

/** Configuration file info */
interface ConfigFileInfo {
    path: string;
    wrapperKey: string; // e.g., 'mcpServers' or 'servers'
    serverKey: string;  // The key name for this server, e.g., 'jira'
}

/** Registry cache for avoiding repeated fetches */
let registryCache: McpRegistry | null = null;

/**
 * Initializes the MCP registry (cached).
 * @returns Initialized MCP registry
 */
async function initializeRegistry(): Promise<McpRegistry> {
    if (!registryCache) {
        registryCache = await createRegistry();
    }
    return registryCache;
}

/**
 * Expands environment variables and home directory in a path.
 */
function expandPath(filePath: string): string {
    return path.resolve(resolvePlatformPath(filePath));
}

/**
 * Gets the config file path and format for each CLI tool using the MCP registry.
 * @param cli - Target CLI tool
 * @param scope - User or project scope
 * @returns Config file info or null if unsupported
 */
async function getConfigFileInfo(cli: SupportedCli, scope: ConfigScope): Promise<ConfigFileInfo | null> {
    const registry = await initializeRegistry();
    const client = registry.getClient(cli);

    if (!client) {
        return null;
    }

    // Check if client supports the requested scope
    if (!registry.supportsScope(cli, scope)) {
        return null;
    }

    // Map Node.js platform to registry platform key
    const platformKey = mapPlatform(process.platform);
    const platformLocations = client.configLocations[platformKey];

    if (!platformLocations) {
        return null;
    }

    // Get path for the requested scope
    // PlatformPaths has: global?, user?, project?, workspace?, local?, managed?, globalAlt?
    const scopePath = platformLocations[scope as keyof typeof platformLocations];

    if (!scopePath || typeof scopePath !== 'string') {
        return null;
    }

    // Expand environment variables and home directory
    const expandedPath = expandPath(scopePath);

    return {
        path: expandedPath,
        wrapperKey: client.configFormat.wrapperKey,
        serverKey: 'jira',
    };
}

/**
 * Creates the MCP server configuration for Jira.
 * @param options - Setup options with credentials
 * @returns MCP server config object
 */
function createJiraServerConfig(options: SetupOptions): McpServerConfig {
    return {
        command: 'npx',
        args: ['-y', '@khanglvm/jira-mcp'],
        env: {
            JIRA_BASE_URL: options.baseUrl,
            JIRA_USERNAME: options.username,
            JIRA_PASSWORD: options.password,
        },
    };
}

/**
 * Reads existing config file or returns empty object.
 * @param filePath - Path to config file
 * @returns Parsed JSON object
 */
function readConfigFile(filePath: string): Record<string, unknown> {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as Record<string, unknown>;
        }
    } catch (error) {
        console.warn(`Warning: Could not read existing config at ${filePath}`);
    }
    return {};
}

/**
 * Ensures parent directories exist.
 * @param filePath - File path to ensure directories for
 */
function ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Injects MCP configuration into the target CLI tool's config file.
 * @param options - Setup options
 * @returns Result message
 */
export async function injectMcpConfig(options: SetupOptions): Promise<{ success: boolean; message: string }> {
    const configInfo = await getConfigFileInfo(options.cli, options.scope);

    if (!configInfo) {
        return {
            success: false,
            message: `Error: ${options.cli} does not support ${options.scope} scope configuration.`,
        };
    }

    try {
        // Read existing config
        const config = readConfigFile(configInfo.path);

        // Get or create the wrapper object (mcpServers, servers, etc.)
        const wrapperKey = configInfo.wrapperKey;
        if (!config[wrapperKey]) {
            config[wrapperKey] = {};
        }
        const wrapper = config[wrapperKey] as Record<string, unknown>;

        // Check if jira config already exists
        if (wrapper[configInfo.serverKey]) {
            console.log(`ℹ️  Existing Jira MCP configuration found. Updating...`);
        }

        // Add/update Jira server config
        wrapper[configInfo.serverKey] = createJiraServerConfig(options);

        // Ensure directory exists and write file
        ensureDirectoryExists(configInfo.path);
        fs.writeFileSync(configInfo.path, JSON.stringify(config, null, 2) + '\n', 'utf-8');

        return {
            success: true,
            message: `✅ Successfully configured Jira MCP for ${options.cli} (${options.scope} scope)\n   Config file: ${configInfo.path}`,
        };
    } catch (error) {
        return {
            success: false,
            message: `Error writing config: ${(error as Error).message}`,
        };
    }
}

/**
 * Parses CLI arguments for setup command.
 * @param args - Command line arguments
 * @returns Parsed options or null if invalid
 */
export function parseSetupArgs(args: string[]): SetupOptions | null {
    const options: Partial<SetupOptions> = {
        scope: 'user', // Default scope
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '-c':
            case '--cli':
                options.cli = nextArg as SupportedCli;
                i++;
                break;
            case '-b':
            case '--base-url':
            case '--url':
                options.baseUrl = nextArg;
                i++;
                break;
            case '-u':
            case '--username':
                options.username = nextArg;
                i++;
                break;
            case '-p':
            case '--password':
                options.password = nextArg;
                i++;
                break;
            case '-s':
            case '--scope':
                options.scope = nextArg as ConfigScope;
                i++;
                break;
        }
    }

    // Validate required fields
    const validClis: SupportedCli[] = [
        'claude-code', 'claude-desktop', 'github-copilot', 'cursor',
        'windsurf', 'roo-code', 'zed', 'factory-droid', 'antigravity', 'gemini-cli',
        'opencode', 'vscode-copilot', 'jetbrains-copilot', 'codex-cli'
    ];

    if (!options.cli || !validClis.includes(options.cli)) {
        return null;
    }
    if (!options.baseUrl || !options.username || !options.password) {
        return null;
    }
    if (options.scope && !['user', 'project'].includes(options.scope)) {
        return null;
    }

    return options as SetupOptions;
}

/**
 * Prints setup help message.
 */
export function printSetupHelp(): void {
    console.log(`
Jira MCP Setup - Inject configuration into AI tool config files

Usage:
  npx @khanglvm/jira-mcp setup -c <cli> -b <url> -u <user> -p <pass> [-s <scope>]

Arguments:
  -c, --cli        Target CLI tool (required)
                   Options: claude-code, claude-desktop, github-copilot, cursor,
                            windsurf, roo-code, zed, factory-droid, antigravity,
                            gemini-cli, opencode, vscode-copilot, jetbrains-copilot,
                            codex-cli

  -b, --base-url   Jira base URL (required)
  -u, --username   Jira username (required)
  -p, --password   Jira password (required)
  -s, --scope      Configuration scope (optional, default: user)
                   Options: user, project

Examples:
  npx @khanglvm/jira-mcp setup -c claude-code -b https://jira.example.com -u admin -p secret
  npx @khanglvm/jira-mcp setup -c cursor -b https://jira.example.com -u admin -p secret -s project

Supported CLI Tools:
  claude-code, claude-desktop, github-copilot, cursor, windsurf, roo-code, zed,
  factory-droid, antigravity, gemini-cli, opencode, vscode-copilot, jetbrains-copilot,
  codex-cli
`);
}

/**
 * Lists all supported CLI tools.
 */
export function printSupportedClis(): void {
    console.log(`
Supported CLI tools (14):
  • claude-code         - Claude Code (Anthropic)
  • claude-desktop      - Claude Desktop App
  • github-copilot      - GitHub Copilot (VS Code)
  • cursor              - Cursor AI Editor
  • windsurf            - Windsurf (Codeium)
  • roo-code            - Roo Code
  • zed                 - Zed Editor
  • factory-droid       - Factory Droid AI
  • antigravity         - Google Antigravity IDE
  • gemini-cli          - Gemini CLI (Google)
  • opencode            - OpenCode Editor
  • vscode-copilot      - VS Code Copilot Extension
  • jetbrains-copilot   - JetBrains IDEs
  • codex-cli           - Codex CLI
`);
}
