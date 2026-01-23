/**
 * @file validation.test.ts
 * @description Integration tests for scope validation
 * Tests scope compatibility, fallback mapping, and batch validation
 */

import { describe, it, expect } from 'bun:test';
import {
  validateToolScope,
  validateBatchScopes,
  getFallbackScope,
  type ScopeRegistry,
} from '../../scripts/tui/src/validation.js';
import {
  mockDetectedTool,
  mockClaudeDesktopTool,
  mockUndetectedTool,
  mockDetectionResults,
} from '../fixtures/mock-tools.js';

// Import validation functions
const validationModule = await import('../../scripts/tui/src/validation.js');

describe('Scope Validation Integration Tests', () => {
  // Create a mock registry for testing
  const mockRegistry: ScopeRegistry = {
    getScopesForClient(name: string) {
      const scopes: Record<string, string[]> = {
        'claude-code': ['user', 'project'],
        'claude-desktop': ['user'], // User scope only
        'cursor': ['user', 'project'],
        'github-copilot': ['user', 'project'],
        'opencode': ['user'],
      };
      return scopes[name] || [];
    },
  };

  describe('Single Tool Validation', () => {
    it('should validate user scope compatibility', () => {
      const result = validateToolScope(mockDetectedTool, 'user', mockRegistry);

      expect(result.toolId).toBe('claude-code');
      expect(result.requestedScope).toBe('user');
      expect(result.isCompatible).toBe(true);
      expect(result.fallbackScope).toBeNull();
      expect(result.warningMessage).toBeNull();
    });

    it('should validate project scope compatibility', () => {
      const result = validateToolScope(mockDetectedTool, 'project', mockRegistry);

      expect(result.toolId).toBe('claude-code');
      expect(result.requestedScope).toBe('project');
      expect(result.isCompatible).toBe(true);
      expect(result.fallbackScope).toBeNull();
      expect(result.warningMessage).toBeNull();
    });

    it('should detect incompatibility and provide fallback', () => {
      // claude-desktop only supports user scope
      const result = validateToolScope(mockClaudeDesktopTool, 'project', mockRegistry);

      expect(result.toolId).toBe('claude-desktop');
      expect(result.requestedScope).toBe('project');
      expect(result.isCompatible).toBe(false);
      expect(result.fallbackScope).toBe('user');
      expect(result.warningMessage).toContain('project scope not supported');
      expect(result.warningMessage).toContain('user');
    });

    it('should include supported scopes in result', () => {
      const result = validateToolScope(mockDetectedTool, 'user', mockRegistry);

      expect(result.supportedScopes).toEqual(['user', 'project']);
    });

    it('should handle tools with no supported scopes', () => {
      const emptyRegistry: ScopeRegistry = {
        getScopesForClient: () => [],
      };

      const result = validateToolScope(mockUndetectedTool, 'user', emptyRegistry);

      expect(result.isCompatible).toBe(false);
      expect(result.supportedScopes).toEqual([]);
      expect(result.fallbackScope).toBeNull();
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple tools in batch', () => {
      const results = validateBatchScopes(mockDetectionResults, 'user', mockRegistry);

      expect(results).toHaveLength(mockDetectionResults.length);

      // Check first result (claude-code - compatible)
      expect(results[0].toolId).toBe('claude-code');
      expect(results[0].isCompatible).toBe(true);

      // Check third result (claude-desktop - also compatible with user)
      expect(results[2].toolId).toBe('claude-desktop');
      expect(results[2].isCompatible).toBe(true);
    });

    it('should identify all incompatibilities in batch', () => {
      const results = validateBatchScopes(mockDetectionResults, 'project', mockRegistry);

      // claude-code is compatible with project
      expect(results[0].isCompatible).toBe(true);

      // cursor may or may not be detected, but if detected it's compatible
      if (results[1].toolId === 'cursor') {
        expect(results[1].isCompatible).toBe(true);
      }

      // claude-desktop is NOT compatible with project
      expect(results[2].toolId).toBe('claude-desktop');
      expect(results[2].isCompatible).toBe(false);
      expect(results[2].fallbackScope).toBe('user');
    });

    it('should return consistent result structure', () => {
      const results = validateBatchScopes(mockDetectionResults, 'user', mockRegistry);

      for (const result of results) {
        expect(result).toHaveProperty('toolId');
        expect(result).toHaveProperty('toolName');
        expect(result).toHaveProperty('requestedScope');
        expect(result).toHaveProperty('supportedScopes');
        expect(result).toHaveProperty('isCompatible');
        expect(result).toHaveProperty('fallbackScope');
        expect(result).toHaveProperty('warningMessage');
      }
    });
  });

  describe('Fallback Scope Mapping', () => {
    it('should map project to user for incompatible tools', () => {
      const fallback = getFallbackScope(mockClaudeDesktopTool, 'project', mockRegistry);

      expect(fallback).toBe('user');
    });

    it('should return null when no fallback available', () => {
      // Tool that doesn't support user or global
      const toolWithNoUserScope = {
        ...mockUndetectedTool,
        id: 'test-tool',
      };

      const emptyRegistry: ScopeRegistry = {
        getScopesForClient: () => ['project'], // Only project, no user/global
      };

      const fallback = getFallbackScope(toolWithNoUserScope, 'project', emptyRegistry);

      expect(fallback).toBeNull();
    });

    it('should not provide fallback when already compatible', () => {
      const result = validateToolScope(mockDetectedTool, 'user', mockRegistry);

      expect(result.isCompatible).toBe(true);
      expect(result.fallbackScope).toBeNull();
    });

    it('should handle global scope as user equivalent', () => {
      const globalRegistry: ScopeRegistry = {
        getScopesForClient: (name: string) => {
          if (name === 'claude-code') return ['global', 'project'];
          return [];
        },
      };

      const result = validateToolScope(mockDetectedTool, 'user', globalRegistry);

      // user request should match global scope
      expect(result.isCompatible).toBe(true);
    });
  });

  describe('Warning Messages', () => {
    it('should generate warning for incompatible scope', () => {
      const result = validateToolScope(mockClaudeDesktopTool, 'project', mockRegistry);

      expect(result.warningMessage).not.toBeNull();
      expect(result.warningMessage).toContain('claude-desktop');
      expect(result.warningMessage).toContain('project scope not supported');
    });

    it('should include fallback in warning message', () => {
      const result = validateToolScope(mockClaudeDesktopTool, 'project', mockRegistry);

      expect(result.warningMessage).toContain('user');
    });

    it('should have no warning for compatible scopes', () => {
      const result = validateToolScope(mockDetectedTool, 'user', mockRegistry);

      expect(result.warningMessage).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool array in batch validation', () => {
      const results = validateBatchScopes([], 'user', mockRegistry);

      expect(results).toEqual([]);
    });

    it('should handle unknown tool IDs gracefully', () => {
      const unknownTool = {
        ...mockUndetectedTool,
        id: 'unknown-tool-xyz',
        name: 'unknown-tool-xyz',
      };

      const emptyRegistry: ScopeRegistry = {
        getScopesForClient: () => [],
      };

      const result = validateToolScope(unknownTool, 'user', emptyRegistry);

      expect(result.toolId).toBe('unknown-tool-xyz');
      expect(result.isCompatible).toBe(false);
      expect(result.supportedScopes).toEqual([]);
    });

    it('should handle tools with only global scope', () => {
      const globalOnlyRegistry: ScopeRegistry = {
        getScopesForClient: () => ['global'],
      };

      const result = validateToolScope(mockDetectedTool, 'user', globalOnlyRegistry);

      // user should be compatible with global
      expect(result.isCompatible).toBe(true);
    });

    it('should normalize scope names correctly', () => {
      // Test that the validation handles various scope formats
      const userResult = validateToolScope(mockDetectedTool, 'user', mockRegistry);
      expect(userResult.isCompatible).toBe(true);

      const projectResult = validateToolScope(mockDetectedTool, 'project', mockRegistry);
      expect(projectResult.isCompatible).toBe(true);
    });
  });
});
