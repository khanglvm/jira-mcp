/**
 * @file validation.ts
 * @description Scope validation for MCP tools
 * Validates tool scope compatibility and provides fallback mappings
 */

import type { DetectionResult } from './detection.js';
import type { ConfigScope } from '../../src/types/mcp-config.js';

/**
 * Scope validation result for a single tool
 */
export interface ScopeValidationResult {
    toolId: string;
    toolName: string;
    requestedScope: 'user' | 'project';
    supportedScopes: ConfigScope[];
    isCompatible: boolean;
    fallbackScope: 'user' | 'project' | null;
    warningMessage: string | null;
}

/**
 * Registry interface for scope validation
 */
export interface ScopeRegistry {
    getScopesForClient(name: string): ConfigScope[];
}

/**
 * Validate a single tool's scope compatibility
 *
 * @param tool - Detection result for the tool
 * @param requestedScope - User-requested scope ('user' or 'project')
 * @param registry - MCP registry instance
 * @returns Validation result with compatibility status and warnings
 */
export function validateToolScope(
    tool: DetectionResult,
    requestedScope: 'user' | 'project',
    registry: ScopeRegistry
): ScopeValidationResult {
    const supportedScopes = registry.getScopesForClient(tool.id) || [];

    // Normalize: user/global are equivalent for validation
    // Most tools support 'user' or 'global' scope interchangeably
    const normalizedRequested = requestedScope === 'user' ? ['user', 'global'] : ['project'];
    const isCompatible = normalizedRequested.some(s => supportedScopes.includes(s as ConfigScope));

    const fallback = isCompatible ? null : getFallbackScope(tool, requestedScope, registry);
    const warning = isCompatible ? null :
        `${tool.displayName}: project scope not supported, will use ${fallback || 'global'}`;

    return {
        toolId: tool.id,
        toolName: tool.displayName,
        requestedScope,
        supportedScopes,
        isCompatible,
        fallbackScope: fallback,
        warningMessage: warning,
    };
}

/**
 * Validate multiple tools in batch
 *
 * @param tools - Array of detection results
 * @param requestedScope - User-requested scope ('user' or 'project')
 * @param registry - MCP registry instance
 * @returns Array of validation results
 */
export function validateBatchScopes(
    tools: DetectionResult[],
    requestedScope: 'user' | 'project',
    registry: ScopeRegistry
): ScopeValidationResult[] {
    return tools.map(tool => validateToolScope(tool, requestedScope, registry));
}

/**
 * Get fallback scope for incompatible tool
 *
 * @param tool - Detection result for the tool
 * @param requestedScope - User-requested scope
 * @param registry - MCP registry instance
 * @returns Fallback scope or null if no fallback available
 */
export function getFallbackScope(
    tool: DetectionResult,
    requestedScope: 'user' | 'project',
    registry: ScopeRegistry
): 'user' | 'project' | null {
    const supported = registry.getScopesForClient(tool.id) || [];

    if (requestedScope === 'project') {
        // Fallback: project -> user/global
        // Most tools that don't support project scope support user/global
        if (supported.includes('user' as ConfigScope) || supported.includes('global' as ConfigScope)) {
            return 'user';
        }
    }

    // No fallback available
    return null;
}
