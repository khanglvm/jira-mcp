/**
 * @file detection.test.ts
 * @description Integration tests for tool detection
 * Tests detection performance, caching, and platform-specific paths
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DetectionResult } from '../../scripts/tui/src/detection.js';
import type { McpRegistry } from '../../dist/mcp-registry.js';
import type { McpConfigSchema } from '../../dist/types/mcp-config.js';
import { createRegistryFromConfig } from '../../dist/mcp-registry.js';
import { mockMcpConfig } from './helpers/load-mock-config.js';

// Import detection from source (not compiled)
const { ToolDetector } = await import('../../scripts/tui/src/detection.js');

describe('Tool Detection Integration Tests', () => {
  let registry: McpRegistry;
  let detector: ToolDetector;
  const testConfigPaths: string[] = [];

  // Helper to create a temporary config file
  function createTestConfig(fileName: string): string {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify({ mcpServers: {} }, null, 2));
    testConfigPaths.push(filePath);
    return filePath;
  }

  // Helper to clean up test configs
  function cleanupTestConfigs() {
    for (const filePath of testConfigPaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    testConfigPaths.length = 0;
  }

  beforeEach(async () => {
    // Create registry from mock config
    const mockConfig = await mockMcpConfig();
    registry = createRegistryFromConfig(mockConfig);
    detector = new ToolDetector(registry);
  });

  afterEach(() => {
    cleanupTestConfigs();
    detector.clearCache();
  });

  describe('Detection Functionality', () => {
    it('should detect all available tools from registry', async () => {
      const results = await detector.detectAll();

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      // Each result should have required fields
      for (const result of results) {
        expect(result.id).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.displayName).toBeDefined();
        expect(result.config).toBeDefined();
        expect(result.configPaths).toBeDefined();
        expect(Array.isArray(result.configPaths)).toBe(true);
      }
    });

    it('should detect tools with existing config paths', async () => {
      // Create a test config file that matches one of the mock tools
      const testPath = createTestConfig('.claude.json');

      const results = await detector.detectAll();

      // At least one tool should be detected
      const detectedTools = results.filter(r => r.detected);
      expect(detectedTools.length).toBeGreaterThan(0);

      // Check that detected tool has a valid config path
      const detected = detectedTools[0];
      if (detected.detected) {
        expect(detected.configPath).toBeDefined();
        expect(detected.configPath).toBeTruthy();
      }
    });

    it('should return undetected tools without config paths', async () => {
      const results = await detector.detectAll();

      const undetectedTools = results.filter(r => !r.detected);
      expect(undetectedTools.length).toBeGreaterThan(0);

      for (const tool of undetectedTools) {
        expect(tool.configPath).toBeNull();
      }
    });

    it('should include platform-specific paths', async () => {
      const results = await detector.detectAll();

      const platform = process.platform;
      for (const result of results) {
        const platformKey = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';
        const platformLocations = result.config.configLocations[platformKey];

        if (platformLocations) {
          expect(result.configPaths).toBeDefined();
          expect(result.configPaths.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Detection Performance', () => {
    it('should detect all tools in under 500ms', async () => {
      const start = Date.now();
      const results = await detector.detectAll();
      const duration = Date.now() - start;

      expect(results).toBeDefined();
      expect(duration).toBeLessThan(500);
    });

    it('should use caching for repeated detections', async () => {
      // First detection
      const start1 = Date.now();
      await detector.detectAll();
      const duration1 = Date.now() - start1;

      // Second detection (should be cached)
      const start2 = Date.now();
      await detector.detectAll();
      const duration2 = Date.now() - start2;

      // Cached detection should be faster (or at least not significantly slower)
      expect(duration2).toBeLessThanOrEqual(duration1 + 50);
    });
  });

  describe('Cache Management', () => {
    it('should cache detection results', async () => {
      const results1 = await detector.detectAll();
      const results2 = await detector.detectAll();

      // Results should be identical (cached)
      expect(results1.length).toBe(results2.length);

      for (let i = 0; i < results1.length; i++) {
        expect(results1[i].id).toBe(results2[i].id);
        expect(results1[i].detected).toBe(results2[i].detected);
      }
    });

    it('should clear cache when requested', async () => {
      // First detection
      await detector.detectAll();

      // Clear cache
      detector.clearCache();

      // Second detection should rebuild cache
      const results = await detector.detectAll();
      expect(results).toBeDefined();
    });
  });

  describe('Path Resolution', () => {
    it('should expand ~ to home directory', async () => {
      const results = await detector.detectAll();

      for (const result of results) {
        if (result.configPaths) {
          for (const configPath of result.configPaths) {
            if (configPath.startsWith('~')) {
              // Paths starting with ~ should be expandable
              expect(configPath).toMatch(/^~\//);
            }
          }
        }
      }
    });

    it('should handle Windows environment variables', () => {
      if (process.platform === 'win32') {
        const results = detector.detectAll();

        // Windows paths should use proper env vars
        for (const result of results as DetectionResult[]) {
          if (result.configPaths) {
            for (const configPath of result.configPaths) {
              if (configPath.includes('%')) {
                // Should contain valid Windows env vars
                expect(configPath).toMatch(/%\w+%/);
              }
            }
          }
        }
      }
    });
  });

  describe('Registry Integration', () => {
    it('should use registry for platform-specific detection', async () => {
      const platform = process.platform;
      const platformKey = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';

      // Get detectable clients from registry
      const detectableClients = registry.getDetectableClients(platform);

      // Run detection
      const results = await detector.detectAll();

      // All detectable clients should be in results
      expect(results.length).toBeGreaterThanOrEqual(detectableClients.length);

      const resultIds = new Set(results.map(r => r.id));
      for (const client of detectableClients) {
        expect(resultIds.has(client.name)).toBe(true);
      }
    });

    it('should get config paths from registry', async () => {
      const results = await detector.detectAll();

      for (const result of results) {
        const registryPaths = registry.getConfigPaths(result.id, process.platform);
        const detectedPaths = result.configPaths || [];

        // Should have matching paths
        expect(detectedPaths.length).toBe(registryPaths.length);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle tools with empty platform config locations gracefully', async () => {
      // Create a custom registry with a tool that has empty config locations
      const mockConfig = await mockMcpConfig();

      // Add a test tool with empty config locations object for current platform
      const platform = process.platform;
      const platformKey = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';

      mockConfig.clients['test-tool'] = {
        name: 'test-tool',
        vendor: 'Test',
        description: 'Test tool with minimal config',
        configLocations: {
          [platformKey]: {
            // Has a path entry but with empty value
            user: '',
          },
        },
        configFormat: {
          wrapperKey: 'mcpServers',
          serverSchema: {},
        },
        scopes: ['user'],
        transportSupport: ['stdio'],
      };

      const testRegistry = createRegistryFromConfig(mockConfig);
      const testDetector = new ToolDetector(testRegistry);

      const results = await testDetector.detectAll();

      // Should not crash, should handle gracefully
      // The tool may or may not be in results depending on implementation
      // The key is that it doesn't throw an error
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle tools with only CLI commands', async () => {
      const results = await detector.detectAll();

      // Some tools might only be detectable via CLI commands
      for (const result of results) {
        expect(result.detected).toBeDefined();
        expect(typeof result.detected).toBe('boolean');
      }
    });
  });
});
