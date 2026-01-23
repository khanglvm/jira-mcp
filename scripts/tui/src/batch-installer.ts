/**
 * @file batch-installer.ts
 * @description Batch installation logic for parallel MCP tool configuration
 * Processes multiple tools with scope validation, fallback handling, and error collection
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DetectionResult } from './detection.js';
import type { CredentialsForm } from './types.js';
import type { McpRegistry } from '../../src/mcp-registry.js';
import { validateToolScope } from './validation.js';
import { mapPlatform, resolvePlatformPath } from './utils/path-resolver.js';

const PACKAGE_NAME = '@khanglvm/jira-mcp';

/**
 * Installation options for a single tool
 */
export interface InstallOptions {
    tool: DetectionResult;
    scope: 'user' | 'project';
    credentials: CredentialsForm;
    registry: McpRegistry;
}

/**
 * Result of installing a single tool
 */
export interface InstallResult {
    toolId: string;
    toolName: string;
    success: boolean;
    configPath: string | null;
    actualScope: 'user' | 'project';
    scopeFallback: boolean;
    errorMessage: string | null;
    backupName: string | null;
}

/**
 * Create Jira MCP server config for Claude Desktop / Claude Code
 */
function createClaudeConfig(creds: CredentialsForm) {
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
function createOpenCodeConfig(creds: CredentialsForm) {
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
 * Get config path for a tool and scope
 * Returns the appropriate path based on scope (user vs project)
 */
function getConfigPathForScope(tool: DetectionResult, scope: 'user' | 'project'): string | null {
    const platform = process.platform as 'darwin' | 'linux' | 'win32';
    const platformKey = mapPlatform(platform);
    const platformLocations = tool.config.configLocations[platformKey];

    if (!platformLocations) {
        return null;
    }

    // Map scope to path key
    // 'user' scope maps to 'user' or 'global' path
    // 'project' scope maps to 'project' or 'local' path
    if (scope === 'user') {
        // Prefer user path, fallback to global
        return platformLocations.user || platformLocations.global || null;
    } else {
        // Prefer project path, fallback to local
        return platformLocations.project || platformLocations.local || null;
    }
}

/**
 * Read existing config file or return empty object
 */
function readConfig(filePath: string): Record<string, unknown> {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as Record<string, unknown>;
        }
    } catch {
        // Return empty on parse error
    }
    return {};
}

/**
 * Ensure directory exists for config file
 */
function ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Create backup of existing config
 */
function createBackup(filePath: string): string | null {
    if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        return path.basename(backupPath);
    }
    return null;
}

/**
 * Sanitize path for error messages (remove home directory for privacy)
 */
function sanitizePath(filePath: string): string {
    return filePath.replace(os.homedir(), '~');
}

/**
 * Install a single tool with scope validation and fallback handling
 *
 * @param options - Installation options including tool, scope, credentials, registry
 * @returns Installation result with success status and metadata
 */
export async function installTool(options: InstallOptions): Promise<InstallResult> {
    const { tool, scope, credentials, registry } = options;

    // Validate scope and get fallback if needed
    const validation = validateToolScope(tool, scope, registry);
    const actualScope: 'user' | 'project' = (validation.fallbackScope || scope) as 'user' | 'project';

    // Get config path for actual scope
    const configPathTemplate = getConfigPathForScope(tool, actualScope);
    if (!configPathTemplate) {
        return {
            toolId: tool.id,
            toolName: tool.displayName,
            success: false,
            configPath: null,
            actualScope,
            scopeFallback: !!validation.fallbackScope,
            errorMessage: `No config path available for ${actualScope} scope`,
            backupName: null,
        };
    }

    const configPath = resolvePlatformPath(configPathTemplate);

    try {
        // Create backup
        const backupName = createBackup(configPath);

        // Read existing config
        const config = readConfig(configPath);

        // Get wrapper key from tool config
        const wrapperKey = tool.config.configFormat.wrapperKey;

        // Ensure wrapper key exists
        if (!config[wrapperKey]) {
            config[wrapperKey] = {};
        }
        const wrapper = config[wrapperKey] as Record<string, unknown>;

        // Add jira server config based on tool format
        if (tool.id === 'opencode') {
            wrapper['jira'] = createOpenCodeConfig(credentials);
        } else {
            wrapper['jira'] = createClaudeConfig(credentials);
        }

        // Ensure directory and write
        ensureDir(configPath);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

        return {
            toolId: tool.id,
            toolName: tool.displayName,
            success: true,
            configPath,
            actualScope,
            scopeFallback: !!validation.fallbackScope,
            errorMessage: null,
            backupName,
        };
    } catch (error) {
        return {
            toolId: tool.id,
            toolName: tool.displayName,
            success: false,
            configPath,
            actualScope,
            scopeFallback: !!validation.fallbackScope,
            errorMessage: (error as Error).message,
            backupName: null,
        };
    }
}

/**
 * Batch install multiple tools in parallel
 * Uses Promise.allSettled for unlimited parallelization without aborting on errors
 *
 * @param options - Array of installation options for each tool
 * @returns Array of installation results (one per tool)
 */
export async function batchInstall(options: InstallOptions[]): Promise<InstallResult[]> {
    // Unlimited parallelization - no concurrency limit
    const results = await Promise.allSettled(
        options.map(opt => installTool(opt))
    );

    return results.map(r => {
        if (r.status === 'fulfilled') {
            return r.value;
        }

        // Handle rejected promises
        return {
            toolId: 'unknown',
            toolName: 'Unknown',
            success: false,
            configPath: null,
            actualScope: 'user',
            scopeFallback: false,
            errorMessage: r.reason?.message || 'Unknown error',
            backupName: null,
        };
    });
}
