/**
 * @file mcp-registry.ts
 * @description MCP client registry for dynamic tool configuration.
 * Provides query methods for accessing MCP client configs by scope/platform.
 */

import type {
    McpConfigSchema,
    McpClientConfig,
    ConfigScope,
    TransportType,
    WrapperKey,
} from './types/mcp-config.js';
import { fetchMcpConfig } from './config-fetcher.js';
import { mapPlatform } from './utils/path-resolver.js';

/**
 * MCP Registry class for querying client configurations.
 * Caches config data and provides filtering methods.
 */
export class McpRegistry {
    private clients: Map<string, McpClientConfig>;

    constructor(private config: McpConfigSchema) {
        this.clients = new Map(Object.entries(config.clients));
    }

    /**
     * Gets all client configurations.
     */
    getAllClients(): McpClientConfig[] {
        return Array.from(this.clients.values());
    }

    /**
     * Gets a specific client by name.
     * Returns null if client not found.
     */
    getClient(name: string): McpClientConfig | null {
        return this.clients.get(name) || null;
    }

    /**
     * Gets clients filtered by scope capability.
     * Returns clients that support the given scope.
     */
    getClientsByScope(scope: ConfigScope): McpClientConfig[] {
        return this.getAllClients().filter(client =>
            client.scopes.includes(scope)
        );
    }

    /**
     * Gets clients that have detectable config paths for the platform.
     */
    getDetectableClients(platform: NodeJS.Platform): McpClientConfig[] {
        const platformKey = mapPlatform(platform);
        return this.getAllClients().filter(client => {
            const platformLocations = client.configLocations[platformKey];
            return platformLocations && Object.keys(platformLocations).length > 0;
        });
    }

    /**
     * Gets config file paths for a client on the current platform.
     */
    getConfigPaths(clientName: string, platform: NodeJS.Platform): string[] {
        const client = this.getClient(clientName);
        if (!client) {
            return [];
        }

        const platformKey = mapPlatform(platform);
        const platformLocations = client.configLocations[platformKey];

        if (!platformLocations) {
            return [];
        }

        return Object.values(platformLocations).filter(p => typeof p === 'string' && p.length > 0);
    }

    /**
     * Gets scopes supported by a client.
     */
    getScopesForClient(name: string): ConfigScope[] {
        const client = this.getClient(name);
        return client?.scopes || [];
    }

    /**
     * Checks if a client supports a specific scope.
     */
    supportsScope(name: string, scope: ConfigScope): boolean {
        return this.getScopesForClient(name).includes(scope);
    }

    /**
     * Gets transport types supported by a client.
     */
    getTransportsForClient(name: string): TransportType[] {
        const client = this.getClient(name);
        return client?.transportSupport || [];
    }

    /**
     * Gets wrapper key for a client (mcpServers, mcp, servers, etc.).
     */
    getWrapperKey(name: string): WrapperKey | null {
        const client = this.getClient(name);
        return client?.configFormat.wrapperKey || null;
    }

    /**
     * Gets clients filtered by wrapper key.
     * Useful for grouping clients by config format.
     */
    getClientsByWrapperKey(wrapperKey: WrapperKey): McpClientConfig[] {
        return this.getAllClients().filter(client =>
            client.configFormat.wrapperKey === wrapperKey
        );
    }

    /**
     * Gets clients that support a specific transport type.
     */
    getClientsByTransport(transport: TransportType): McpClientConfig[] {
        return this.getAllClients().filter(client =>
            client.transportSupport.includes(transport)
        );
    }

    /**
     * Gets CLI commands for a client (if available).
     */
    getCliCommands(name: string): McpClientConfig['cli'] {
        const client = this.getClient(name);
        return client?.cli;
    }

    /**
     * Checks if a client has CLI management support.
     */
    hasCliSupport(name: string): boolean {
        const commands = this.getCliCommands(name);
        return commands !== undefined && Object.keys(commands).length > 0;
    }

    /**
     * Gets config format type for a client (json, yaml, toml).
     */
    getConfigFormat(name: string): string {
        const client = this.getClient(name);
        return client?.configFormat.format || 'json';
    }

    /**
     * Gets all client names.
     */
    getClientNames(): string[] {
        return Array.from(this.clients.keys());
    }

    /**
     * Searches clients by name (case-insensitive partial match).
     */
    searchClients(query: string): McpClientConfig[] {
        const lowerQuery = query.toLowerCase();
        return this.getAllClients().filter(client =>
            client.name.toLowerCase().includes(lowerQuery) ||
            client.vendor?.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Gets registry metadata.
     */
    getMetadata(): { version: string; lastUpdated: string; clientCount: number } {
        return {
            version: this.config.version,
            lastUpdated: this.config.lastUpdated,
            clientCount: this.clients.size,
        };
    }
}

/**
 * Creates an MCP registry instance by fetching config.
 * This is the main entry point for using the registry.
 *
 * @param options - Fetch options for getting config
 * @returns Initialized MCP registry
 */
export async function createRegistry(options?: { forceRefresh?: boolean }): Promise<McpRegistry> {
    const config = await fetchMcpConfig(options);
    return new McpRegistry(config);
}

/**
 * Creates a registry from existing config data.
 * Useful for testing or using cached config.
 */
export function createRegistryFromConfig(config: McpConfigSchema): McpRegistry {
    return new McpRegistry(config);
}
