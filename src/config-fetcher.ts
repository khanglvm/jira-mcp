/**
 * @file config-fetcher.ts
 * @description HTTP config fetcher with hybrid caching (memory + file).
 * Fetches remote MCP config from GitHub with offline fallback support.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import type {
    McpConfigSchema,
    FetchOptions,
    CacheEntry,
    ConfigFileType,
} from './types/mcp-config.js';

// Constants
const REMOTE_URL = 'https://raw.githubusercontent.com/khanglvm/aic/main/mcp/mcp-conf.json';
const CACHE_TTL = 60 * 1000; // 1 minute
const TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRIES = 3;

// In-memory cache entry
let memoryCache: CacheEntry | null = null;

/**
 * Zod schema for MCP config validation.
 * Ensures remote JSON has required fields.
 */
const mcpConfigSchema = z.object({
    $schema: z.string().optional(),
    $id: z.string().optional(),
    version: z.string(),
    lastUpdated: z.string(),
    description: z.string().optional(),
    clients: z.record(z.object({
        name: z.string(),
        vendor: z.string().optional(),
        description: z.string().optional(),
        docsUrl: z.string().optional(),
        configLocations: z.record(z.record(z.string())),
        configFormat: z.object({
            wrapperKey: z.enum(['mcpServers', 'mcp', 'servers', 'context_servers', 'mcp_servers']),
            serverSchema: z.object({
                command: z.any().optional(),
                args: z.any().optional(),
                url: z.any().optional(),
                headers: z.any().optional(),
                env: z.any().optional(),
                environment: z.any().optional(),
            }).passthrough(),
            format: z.enum(['json', 'yaml', 'toml']).optional(),
        }).passthrough(),
        cli: z.any().optional(),
        scopes: z.array(z.string()),
        transportSupport: z.array(z.string()),
        notes: z.array(z.string()).optional(),
    })),
});

/**
 * Gets the cache file path for MCP config.
 * Platform-specific: ~/.cache/jira-mcp/mcp-conf.json
 */
function getCacheFilePath(): string {
    return path.join(os.homedir(), '.cache', 'jira-mcp', 'mcp-conf.json');
}

/**
 * Ensures cache directory exists with proper permissions.
 */
function ensureCacheDir(): void {
    const cacheDir = path.dirname(getCacheFilePath());
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
    }
}

/**
 * Persists config data to file cache.
 * Uses secure permissions (0600 - owner read/write only).
 */
function persistToFile(data: McpConfigSchema, etag?: string): void {
    try {
        ensureCacheDir();
        const cacheEntry: CacheEntry = {
            data,
            etag,
            fetchedAt: Date.now(),
            ttl: CACHE_TTL,
        };
        const filePath = getCacheFilePath();
        fs.writeFileSync(filePath, JSON.stringify(cacheEntry, null, 2), { mode: 0o600 });
    } catch (error) {
        console.warn(`Warning: Failed to write cache file: ${(error as Error).message}`);
    }
}

/**
 * Reads config from file cache.
 * Returns null if cache doesn't exist or is invalid.
 */
function readFromFile(): McpConfigSchema | null {
    try {
        const filePath = getCacheFilePath();
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const cacheEntry = JSON.parse(content) as CacheEntry;

        // Validate cache entry structure
        if (!cacheEntry.data || typeof cacheEntry.data !== 'object') {
            return null;
        }

        return cacheEntry.data;
    } catch (error) {
        console.warn(`Warning: Failed to read cache file: ${(error as Error).message}`);
        return null;
    }
}

/**
 * Detects config file type from extension.
 */
export function detectConfigFileType(filePath: string): ConfigFileType {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.json':
            return 'json';
        case '.yaml':
        case '.yml':
            return 'yaml';
        case '.toml':
            return 'toml';
        default:
            return 'json'; // default
    }
}

/**
 * Parses config file based on type (JSON or YAML).
 * For YAML, attempts to load js-yaml package if available.
 */
async function parseConfigFile(filePath: string, content: string): Promise<Record<string, unknown>> {
    const fileType = detectConfigFileType(filePath);

    if (fileType === 'yaml') {
        try {
            // Try to load js-yaml dynamically (optional dependency)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const yamlModule = await (import('js-yaml') as Promise<any>).catch(() => null);
            if (!yamlModule) {
                throw new Error(
                    'YAML parsing requires js-yaml package.\n' +
                    'Install it with: npm install js-yaml'
                );
            }
            return yamlModule.load(content) as Record<string, unknown>;
        } catch (error) {
            throw new Error(`Failed to parse YAML file: ${(error as Error).message}`);
        }
    }

    // Default to JSON parsing
    return JSON.parse(content) as Record<string, unknown>;
}

/**
 * Sleep utility for exponential backoff.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches remote config with retry logic and timeout.
 * Implements exponential backoff: 1s, 2s, 4s.
 */
async function fetchWithRetry(
    url: string,
    retries = DEFAULT_RETRIES
): Promise<{ data: string; etag?: string }> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': '@khanglvm/jira-mcp',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return {
                data: await response.text(),
                etag: response.headers.get('ETag') || undefined,
            };
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                throw new Error(`Request timeout after ${TIMEOUT}ms`);
            }

            if (attempt === retries - 1) {
                throw error;
            }

            const backoffMs = 1000 * Math.pow(2, attempt);
            console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${backoffMs}ms...`);
            await sleep(backoffMs);
        }
    }

    throw new Error('All fetch attempts failed');
}

/**
 * Validates MCP config schema using Zod.
 */
function validateConfig(data: unknown): McpConfigSchema {
    const result = mcpConfigSchema.safeParse(data);

    if (!result.success) {
        const errors = result.error.errors
            .map(e => `  - ${e.path.join('.')}: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid MCP config schema:\n${errors}`);
    }

    return result.data as McpConfigSchema;
}

/**
 * Main function to fetch MCP configuration.
 * Cache hierarchy: memory -> remote -> file -> error
 */
export async function fetchMcpConfig(options?: FetchOptions): Promise<McpConfigSchema> {
    const forceRefresh = options?.forceRefresh ?? false;
    const retries = options?.retries ?? DEFAULT_RETRIES;

    // 1. Check memory cache first
    if (!forceRefresh && memoryCache && Date.now() - memoryCache.fetchedAt < memoryCache.ttl) {
        return memoryCache.data;
    }

    // Clear expired cache
    if (memoryCache) {
        memoryCache = null;
    }

    // 2. Try remote fetch
    if (options?.timeout === 0) {
        throw new Error('Remote fetch disabled by configuration');
    }

    try {
        const { data, etag } = await fetchWithRetry(REMOTE_URL, retries);
        const validated = validateConfig(JSON.parse(data) as unknown);

        // Update caches
        memoryCache = { data: validated, etag, fetchedAt: Date.now(), ttl: CACHE_TTL };
        persistToFile(validated, etag);

        return validated;
    } catch (error) {
        console.warn(`Remote fetch failed: ${(error as Error).message}`);

        // 3. Fallback to file cache
        const fileData = readFromFile();
        if (fileData) {
            console.info('Using cached configuration from file');
            memoryCache = { data: fileData, fetchedAt: Date.now(), ttl: CACHE_TTL };
            return fileData;
        }

        throw new Error(
            'Failed to fetch MCP configuration and no cached data available.\n' +
            'Please check your internet connection and try again.'
        );
    }
}

/**
 * Clears all caches (memory and file).
 * Useful for testing or forcing fresh fetch.
 */
export function clearCache(): void {
    memoryCache = null;

    try {
        const filePath = getCacheFilePath();
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.warn(`Warning: Failed to clear cache file: ${(error as Error).message}`);
    }
}

/**
 * Gets current cache status.
 * Useful for debugging and monitoring.
 */
export function getCacheStatus(): { memory: boolean; file: boolean; age?: number } {
    const memory = memoryCache !== null;
    const filePath = getCacheFilePath();
    const file = fs.existsSync(filePath);

    let age: number | undefined;
    if (memoryCache) {
        age = Date.now() - memoryCache.fetchedAt;
    }

    return { memory, file, age };
}
