/**
 * @file batch-install.test.ts
 * @description Integration tests for batch installation
 * Tests multi-tool installation, partial failure handling, and scope fallback
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { McpRegistry } from '../../dist/mcp-registry.js';
import { createRegistryFromConfig } from '../../dist/mcp-registry.js';
import { mockMcpConfig } from './helpers/load-mock-config.js';
import { mockDetectedTool, mockClaudeDesktopTool, mockCredentials } from '../fixtures/mock-tools.js';

// Import batch installer functions
const { installTool, batchInstall } = await import('../../scripts/tui/src/batch-installer.js');

describe('Batch Installation Integration Tests', () => {
  let registry: McpRegistry;
  const testConfigPaths: string[] = [];
  const testBackupPaths: string[] = [];

  // Helper to create a temporary config file
  function createTestConfig(fileName: string, content = '{}'): string {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `jira-mcp-test-${Date.now()}-${fileName}`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    testConfigPaths.push(filePath);
    return filePath;
  }

  // Helper to clean up test configs and backups
  function cleanupTestConfigs() {
    // Remove test config files
    for (const filePath of testConfigPaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    // Remove backup files
    for (const backupPath of testBackupPaths) {
      try {
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    testConfigPaths.length = 0;
    testBackupPaths.length = 0;
  }

  beforeEach(async () => {
    // Create registry from mock config
    const mockConfig = await mockMcpConfig();
    registry = createRegistryFromConfig(mockConfig);
  });

  afterEach(() => {
    cleanupTestConfigs();
  });

  describe('Single Tool Installation', () => {
    it('should install tool with user scope', async () => {
      const testPath = createTestConfig('.claude.json');

      // Modify tool config to use test path
      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            ...mockDetectedTool.config.configLocations,
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('claude-code');
      expect(result.actualScope).toBe('user');
      expect(result.scopeFallback).toBe(false);
      expect(result.errorMessage).toBeNull();

      // Verify config was written
      expect(fs.existsSync(testPath)).toBe(true);
      const content = fs.readFileSync(testPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers.jira).toBeDefined();
      expect(config.mcpServers.jira.command).toBe('npx');
    });

    it('should install tool with project scope', async () => {
      const testPath = createTestConfig('.mcp.json');

      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            ...mockDetectedTool.config.configLocations,
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              project: testPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'project',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);
      expect(result.actualScope).toBe('project');
    });

    it('should apply scope fallback when incompatible', async () => {
      const testPath = createTestConfig('claude_desktop_config.json');

      // claude-desktop only supports user scope
      const testTool = {
        ...mockClaudeDesktopTool,
        config: {
          ...mockClaudeDesktopTool.config,
          configLocations: {
            ...mockClaudeDesktopTool.config.configLocations,
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      // Request project scope (incompatible)
      const result = await installTool({
        tool: testTool,
        scope: 'project',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);
      expect(result.actualScope).toBe('user'); // Fallback applied
      expect(result.scopeFallback).toBe(true);
    });

    it('should handle special config format for OpenCode', async () => {
      const testPath = createTestConfig('opencode-mcp.json');

      const opencodeTool = {
        ...mockDetectedTool,
        id: 'opencode',
        name: 'opencode',
        config: {
          ...mockDetectedTool.config,
          name: 'opencode',
          configFormat: {
            wrapperKey: 'mcpServers',
            serverSchema: {},
          },
          configLocations: {
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: opencodeTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);

      // Verify OpenCode-specific format
      const content = fs.readFileSync(testPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.mcpServers.jira.type).toBe('local');
      expect(Array.isArray(config.mcpServers.jira.command)).toBe(true);
    });

    it('should create backup of existing config', async () => {
      const testPath = createTestConfig('.claude.json', '{"existing": "data"}');

      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            ...mockDetectedTool.config.configLocations,
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);
      expect(result.backupName).not.toBeNull();
      expect(result.backupName).toContain('backup');

      // Verify backup file exists
      const backupPath = testPath + '.backup.' + result.backupName?.split('.').pop();
      testBackupPaths.push(backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should handle missing config path gracefully', async () => {
      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            // No config locations
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No config path available');
    });
  });

  describe('Batch Installation', () => {
    it('should install multiple tools in parallel', async () => {
      const paths = [
        createTestConfig('claude.json'),
        createTestConfig('cursor.json'),
      ];

      const tools = [
        {
          ...mockDetectedTool,
          config: {
            ...mockDetectedTool.config,
            configLocations: {
              [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
                user: paths[0],
              },
            },
          },
        },
        {
          ...mockDetectedTool,
          id: 'cursor',
          name: 'cursor',
          displayName: 'Cursor',
          config: {
            ...mockDetectedTool.config,
            name: 'cursor',
            configLocations: {
              [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
                user: paths[1],
              },
            },
          },
        },
      ];

      const options = tools.map(tool => ({
        tool,
        scope: 'user' as const,
        credentials: mockCredentials,
        registry,
      }));

      const results = await batchInstall(options);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);

      // Verify both configs were written
      for (const p of paths) {
        expect(fs.existsSync(p)).toBe(true);
      }
    });

    it('should handle partial failures gracefully', async () => {
      const validPath = createTestConfig('valid.json');

      const tools = [
        {
          ...mockDetectedTool,
          config: {
            ...mockDetectedTool.config,
            configLocations: {
              [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
                user: validPath,
              },
            },
          },
        },
        {
          // This tool has no config path - will fail
          ...mockDetectedTool,
          id: 'invalid-tool',
          name: 'invalid-tool',
          config: {
            ...mockDetectedTool.config,
            name: 'invalid-tool',
            configLocations: {},
          },
        },
      ];

      const options = tools.map(tool => ({
        tool,
        scope: 'user' as const,
        credentials: mockCredentials,
        registry,
      }));

      const results = await batchInstall(options);

      expect(results).toHaveLength(2);

      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);
      expect(succeeded[0].toolId).toBe('claude-code');
      expect(failed[0].toolId).toBe('invalid-tool');
    });

    it('should apply scope fallbacks in batch', async () => {
      const path1 = createTestConfig('claude-code.json');
      const path2 = createTestConfig('claude-desktop.json');

      const tools = [
        {
          ...mockDetectedTool,
          config: {
            ...mockDetectedTool.config,
            configLocations: {
              [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
                user: path1,
                project: path1,
              },
            },
          },
        },
        {
          ...mockClaudeDesktopTool,
          config: {
            ...mockClaudeDesktopTool.config,
            configLocations: {
              [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
                user: path2,
              },
            },
          },
        },
      ];

      const options = tools.map(tool => ({
        tool,
        scope: 'project' as const, // claude-desktop doesn't support this
        credentials: mockCredentials,
        registry,
      }));

      const results = await batchInstall(options);

      // First tool should succeed with project scope
      expect(results[0].success).toBe(true);
      expect(results[0].actualScope).toBe('project');
      expect(results[0].scopeFallback).toBe(false);

      // Second tool should succeed with fallback to user scope
      expect(results[1].success).toBe(true);
      expect(results[1].actualScope).toBe('user');
      expect(results[1].scopeFallback).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors', async () => {
      // Use a path that cannot be created (permission error simulation)
      const invalidPath = '/root/invalid-path/claude.json';

      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: invalidPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).not.toBeNull();
    });

    it('should handle malformed existing config', async () => {
      const testPath = createTestConfig('malformed.json', '{invalid json}');

      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      // Should overwrite malformed config
      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);

      // Verify file is now valid JSON
      const content = fs.readFileSync(testPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Config File Structure', () => {
    it('should preserve existing config entries', async () => {
      const testPath = createTestConfig('preserve.json', JSON.stringify({
        mcpServers: {
          'existing-server': {
            command: 'existing-command',
            args: [],
          },
        },
      }, null, 2));

      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(testPath, 'utf-8');
      const config = JSON.parse(content);

      // Existing server should be preserved
      expect(config.mcpServers['existing-server']).toBeDefined();
      // New jira server should be added
      expect(config.mcpServers.jira).toBeDefined();
    });

    it('should update existing jira config', async () => {
      const testPath = createTestConfig('update.json', JSON.stringify({
        mcpServers: {
          jira: {
            command: 'old-command',
            args: [],
            env: {
              JIRA_BASE_URL: 'https://old.jira.com',
            },
          },
        },
      }, null, 2));

      const testTool = {
        ...mockDetectedTool,
        config: {
          ...mockDetectedTool.config,
          configLocations: {
            [process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux']: {
              user: testPath,
            },
          },
        },
      };

      const result = await installTool({
        tool: testTool,
        scope: 'user',
        credentials: mockCredentials,
        registry,
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(testPath, 'utf-8');
      const config = JSON.parse(content);

      // Config should be updated
      expect(config.mcpServers.jira.command).toBe('npx');
      expect(config.mcpServers.jira.env.JIRA_BASE_URL).toBe('https://jira.example.com');
    });
  });
});
