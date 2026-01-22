/**
 * @file config.ts
 * @description Config injection logic with safe merging
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SupportedTool, CredentialsForm, McpServerConfig, OpenCodeMcpConfig } from './types.ts';
import { getConfigPath } from './detection.ts';

const PACKAGE_NAME = '@khanglvm/jira-mcp';

/** Create Jira MCP server config for Claude Desktop / Claude Code */
function createClaudeConfig(creds: CredentialsForm): McpServerConfig {
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

/** Create Jira MCP server config for OpenCode */
function createOpenCodeConfig(creds: CredentialsForm): OpenCodeMcpConfig {
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

/** Read existing config file or return empty object */
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

/** Ensure directory exists for config file */
function ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** Create backup of existing config */
function createBackup(filePath: string): string | null {
    if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        return path.basename(backupPath);
    }
    return null;
}

/** Injection result */
export interface InjectionResult {
    success: boolean;
    backupName: string | null;
    message: string;
}

/** Inject Jira MCP config into tool's config file */
export function injectConfig(tool: SupportedTool, creds: CredentialsForm): InjectionResult {
    const configPath = getConfigPath(tool);

    try {
        // Create backup
        const backupName = createBackup(configPath);

        // Read existing config
        const config = readConfig(configPath);

        // Get wrapper key based on tool
        const wrapperKey = tool === 'opencode' ? 'mcp' : 'mcpServers';

        // Ensure wrapper key exists
        if (!config[wrapperKey]) {
            config[wrapperKey] = {};
        }
        const wrapper = config[wrapperKey] as Record<string, unknown>;

        // Add jira server config
        if (tool === 'opencode') {
            wrapper['jira'] = createOpenCodeConfig(creds);
        } else {
            wrapper['jira'] = createClaudeConfig(creds);
        }

        // Ensure directory and write
        ensureDir(configPath);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

        return {
            success: true,
            backupName,
            message: `Configured Jira MCP for ${tool}`,
        };
    } catch (error) {
        return {
            success: false,
            backupName: null,
            message: `Failed: ${(error as Error).message}`,
        };
    }
}
