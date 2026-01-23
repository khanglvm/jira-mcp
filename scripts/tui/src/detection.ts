/**
 * @file detection.ts
 * @description Dynamic tool detection using MCP registry
 * Detects all MCP-compatible tools from registry config
 */

import * as fs from 'fs';
import type { DetectedTool } from './types.ts';
import type { McpClientConfig } from '../../src/types/mcp-config.js';
import { McpRegistry } from '../../src/mcp-registry.js';
import { mapPlatform, resolvePlatformPath } from './utils/path-resolver.js';

/**
 * Enhanced detection result with full tool metadata
 */
export interface DetectionResult {
    id: string;
    name: string;
    displayName: string;
    configPath: string | null;
    configPaths?: string[];
    detected: boolean;
    config: McpClientConfig;
}

/**
 * Check if a CLI command exists in PATH
 * Uses 'which' on Unix, 'where' on Windows
 */
async function checkCommand(cmd: string): Promise<boolean> {
    try {
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';
        const { execSync } = await import('child_process');
        execSync(`${whichCmd} ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a file or directory exists at given path
 * Handles path resolution and environment variables
 */
function checkPath(pathStr: string): boolean {
    try {
        const resolved = resolvePlatformPath(pathStr);
        return fs.existsSync(resolved);
    } catch {
        return false;
    }
}

/**
 * Get platform-specific config paths for a client
 */
function getPlatformPaths(config: McpClientConfig, platform: NodeJS.Platform): string[] {
    const platformKey = mapPlatform(platform);
    const platformLocations = config.configLocations[platformKey];

    if (!platformLocations) {
        return [];
    }

    return Object.values(platformLocations).filter(p => typeof p === 'string' && p.length > 0);
}

/**
 * Find the first existing config path for a client
 */
function getPrimaryConfigPath(paths: string[]): string | null {
    for (const p of paths) {
        if (checkPath(p)) {
            return resolvePlatformPath(p);
        }
    }
    return null;
}

/**
 * Tool Detector class using MCP registry
 * Caches detection results for session duration
 */
export class ToolDetector {
    private cache: Map<string, DetectionResult> = new Map();

    constructor(private registry: McpRegistry) {}

    /**
     * Detect all tools from registry
     * Uses parallel detection for performance
     */
    async detectAll(): Promise<DetectionResult[]> {
        const clients = this.registry.getDetectableClients(process.platform);

        // Parallel detection with Promise.allSettled for graceful error handling
        const results = await Promise.allSettled(
            clients.map(config => this.detectTool(config))
        );

        return results
            .filter((r): r is PromiseFulfilledResult<DetectionResult> => r.status === 'fulfilled')
            .map(r => r.value);
    }

    /**
     * Detect a single tool using multiple strategies
     * Strategy 1: Check CLI commands (if available)
     * Strategy 2: Check config path existence
     */
    private async detectTool(config: McpClientConfig): Promise<DetectionResult> {
        // Check cache first
        if (this.cache.has(config.name)) {
            return this.cache.get(config.name)!;
        }

        const platform = process.platform;
        const paths = getPlatformPaths(config, platform);

        // Strategy 1: Check CLI commands if available
        if (config.cli?.commands) {
            const commands = Object.values(config.cli).filter(
                (cmd): cmd is string => typeof cmd === 'string' && cmd.length > 0
            );

            for (const cmd of commands) {
                // Extract command name from flags (e.g., "claude mcp add" -> "claude")
                const cmdName = cmd.split(' ')[0];
                if (await checkCommand(cmdName)) {
                    const result: DetectionResult = {
                        id: config.name,
                        name: config.name,
                        displayName: config.vendor ? `${config.vendor} ${config.name}` : config.name,
                        configPath: paths[0] || null,
                        configPaths: paths,
                        detected: true,
                        config,
                    };
                    this.cache.set(config.name, result);
                    return result;
                }
            }
        }

        // Strategy 2: Check config path existence
        const existingPath = getPrimaryConfigPath(paths);
        const result: DetectionResult = {
            id: config.name,
            name: config.name,
            displayName: config.vendor ? `${config.vendor} ${config.name}` : config.name,
            configPath: existingPath,
            configPaths: paths,
            detected: !!existingPath,
            config,
        };
        this.cache.set(config.name, result);
        return result;
    }

    /**
     * Clear detection cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

/**
 * Global detector instance
 */
let detectorInstance: ToolDetector | null = null;

/**
 * Main detection function - detects all tools from registry
 * Returns DetectionResult[] with full tool metadata
 */
export async function detectTools(registry: McpRegistry): Promise<DetectionResult[]>;

/**
 * Legacy detection function - backward compatibility
 * Returns DetectedTool[] for existing TUI components
 */
export function detectTools(): DetectedTool[];

/**
 * Overload implementation - supports both registry and legacy modes
 */
export async function detectTools(registry?: McpRegistry): Promise<DetectionResult[] | DetectedTool[]> {
    // New mode: use registry for full detection
    if (registry) {
        if (!detectorInstance) {
            detectorInstance = new ToolDetector(registry);
        }

        try {
            const results = await detectorInstance.detectAll();
            // Return only detected tools for backward compatibility
            return results.filter(r => r.detected) as unknown as DetectedTool[];
        } catch (error) {
            console.error('Tool detection failed:', error);
            return [];
        }
    }

    // Legacy mode: return empty array (will be removed after Phase 05)
    console.warn('detectTools() called without registry - use detectTools(registry) instead');
    return [];
}

/**
 * Initialize detection with registry instance
 * Call this during TUI initialization
 */
export async function initializeDetection(registry: McpRegistry): Promise<void> {
    detectorInstance = new ToolDetector(registry);
}

/**
 * Get config path for a specific tool (legacy compatibility)
 * @deprecated Use DetectionResult.configPath instead
 */
export function getConfigPath(tool: string): string {
    console.warn('getConfigPath() is deprecated - use DetectionResult.configPath instead');
    return '';
}
