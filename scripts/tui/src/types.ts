/**
 * @file types.ts
 * @description Type definitions for Jira MCP Installer
 */

/** Supported AI tools for MCP configuration */
export type SupportedTool = 'claude-desktop' | 'claude-code' | 'opencode';

/** App detection result */
export interface DetectedTool {
    id: SupportedTool;
    name: string;
    configPath: string;
    detected: boolean;
}

/** Installer state views */
export type ViewMode = 'menu' | 'credentials' | 'confirm' | 'success' | 'error';

/** Form data for credentials */
export interface CredentialsForm {
    baseUrl: string;
    username: string;
    password: string;
}

/** MCP server config for Claude Desktop / Claude Code */
export interface McpServerConfig {
    command: string;
    args: string[];
    env: Record<string, string>;
}

/** MCP server config for OpenCode */
export interface OpenCodeMcpConfig {
    type: 'local';
    command: string[];
    environment: Record<string, string>;
}
