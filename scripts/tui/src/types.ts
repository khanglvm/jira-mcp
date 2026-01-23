/**
 * @file types.ts
 * @description Type definitions for Jira MCP Installer
 */

/** Supported AI tools for MCP configuration */
export type SupportedTool = 'claude-desktop' | 'claude-code' | 'opencode';

/** App detection result (legacy) */
export interface DetectedTool {
    id: SupportedTool;
    name: string;
    configPath: string;
    detected: boolean;
}

/** Re-export DetectionResult from detection.ts for dynamic tool support */
export type { DetectionResult } from './detection.js';

/** Installer state views */
export type ViewMode = 'menu' | 'multi-select' | 'scope-select' | 'credentials' | 'confirm' | 'installing' | 'success' | 'error' | 'results';

/** Re-export batch installer types */
export type { InstallResult, InstallOptions } from './batch-installer.js';

/** Re-export injection result from config.ts */
export type { InjectionResult } from './config.js';

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

/** Re-export MCP client config type for dynamic configuration support */
export type { McpClientConfig } from '../../src/types/mcp-config.js';

/** Re-export scope validation types */
export type { ScopeValidationResult } from './validation.js';

/** Scope selection state */
export interface ScopeSelection {
    scope: 'user' | 'project';
    validationResults: ScopeValidationResult[];
    hasWarnings: boolean;
}
