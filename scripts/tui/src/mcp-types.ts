/**
 * @file mcp-types.ts
 * @description MCP-related type definitions for TUI.
 * Re-exports core types and adds TUI-specific extensions.
 */

// Re-export core MCP config types for TUI usage
export type {
    McpClientConfig,
    McpConfigSchema,
    ConfigScope,
    TransportType,
    WrapperKey,
    ConfigLocations,
    ServerSchema,
    ConfigFormat,
    FetchOptions,
} from '../../src/types/mcp-config.js';

import type { McpClientConfig } from '../../src/types/mcp-config.js';

/**
 * Extended detected tool with MCP config metadata.
 * Combines app detection with MCP client configuration.
 */
export interface DetectedMcpTool {
    id: string;
    name: string;
    displayName: string;
    configPath: string;
    detected: boolean;
    config: McpClientConfig | null;
    scopes: string[];
    wrapperKey: string;
    transportSupport: string[];
    hasCliSupport: boolean;
}

/**
 * Tool selection state for multi-select UI.
 */
export interface ToolSelectionState {
    selectedIds: Set<string>;
    tools: DetectedMcpTool[];
    filterScope?: string;
}

/**
 * Config injection result for a tool.
 */
export interface ConfigInjectionResult {
    toolId: string;
    success: boolean;
    message: string;
    configPath: string;
}
