/**
 * @file mcp-config.ts
 * @description Type definitions for dynamic MCP configuration system.
 * Defines schemas for remote config fetcher and MCP client registry.
 */

/**
 * Platform-specific config file locations.
 * Maps platform (macos/windows/linux in remote config) to available config paths.
 * Note: Remote JSON uses macos/windows/linux, not darwin/win32/linux.
 */
export interface ConfigLocations {
    macos?: PlatformPaths;
    windows?: PlatformPaths;
    linux?: PlatformPaths;
}

/**
 * Path configuration for a specific platform.
 */
export interface PlatformPaths {
    global?: string;
    user?: string;
    project?: string;
    workspace?: string;
    local?: string;
    managed?: string;
    globalAlt?: string;
}

/**
 * Wrapper key types used by different MCP clients.
 * Identifies the top-level key containing MCP server configs.
 */
export type WrapperKey =
    | 'mcpServers'
    | 'mcp'
    | 'servers'
    | 'context_servers'
    | 'mcp_servers';

/**
 * Configuration scopes supported by MCP clients.
 */
export type ConfigScope = 'global' | 'user' | 'project' | 'workspace' | 'local' | 'managed';

/**
 * Transport types supported by MCP clients.
 */
export type TransportType = 'stdio' | 'http' | 'sse' | 'local' | 'remote';

/**
 * Server schema definition for MCP config.
 * Describes required/optional fields for server configuration.
 */
export interface ServerSchema {
    type?: string;
    command?: SchemaField;
    args?: SchemaField;
    url?: SchemaField;
    headers?: SchemaField;
    env?: SchemaField;
    environment?: SchemaField;
}

/**
 * Schema field definition.
 */
export interface SchemaField {
    type: string;
    required?: boolean;
    description?: string;
    enum?: string[];
    default?: string;
    items?: string;
}

/**
 * Configuration format details for an MCP client.
 */
export interface ConfigFormat {
    wrapperKey: WrapperKey;
    serverSchema: ServerSchema;
    example?: Record<string, unknown>;
    format?: string; // 'toml', 'yaml', 'json'
    yamlAlternative?: {
        path: string;
        note: string;
        example: string;
    };
}

/**
 * CLI commands for managing MCP servers.
 */
export interface CliCommands {
    add?: string;
    addJson?: string;
    list?: string;
    get?: string;
    remove?: string;
    enable?: string;
    disable?: string;
    edit?: string;
    show?: string;
    importDesktop?: string;
}

/**
 * MCP client configuration from remote JSON.
 */
export interface McpClientConfig {
    name: string;
    vendor?: string;
    description?: string;
    docsUrl?: string;
    configLocations: ConfigLocations;
    managedConfig?: Record<string, string>;
    configFormat: ConfigFormat;
    cli?: CliCommands;
    scopes: ConfigScope[];
    transportSupport: TransportType[];
    notes?: string[];
    ui?: {
        access?: string;
        install?: string;
        manage?: string;
    };
}

/**
 * Remote MCP configuration schema.
 * Top-level structure fetched from GitHub.
 */
export interface McpConfigSchema {
    $schema?: string;
    $id?: string;
    version: string;
    lastUpdated: string;
    description?: string;
    clients: Record<string, McpClientConfig>;
    commonPatterns?: {
        stdioServer?: Record<string, unknown>;
        httpServer?: Record<string, unknown>;
    };
    wrapperKeyMapping?: Record<WrapperKey, string[]>;
    envVariableExpansion?: Record<string, unknown>;
}

/**
 * Options for fetching MCP configuration.
 */
export interface FetchOptions {
    forceRefresh?: boolean;
    timeout?: number;
    retries?: number;
}

/**
 * Cache entry for in-memory caching.
 */
export interface CacheEntry {
    data: McpConfigSchema;
    etag?: string;
    fetchedAt: number;
    ttl: number; // milliseconds
}

/**
 * Config file type (JSON, YAML, TOML).
 */
export type ConfigFileType = 'json' | 'yaml' | 'toml';
