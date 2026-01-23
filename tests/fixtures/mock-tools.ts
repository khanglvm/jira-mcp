/**
 * @file mock-tools.ts
 * @description Mock detection results for testing
 */

import type { DetectionResult } from '../../scripts/tui/src/detection.js';
import type { McpClientConfig } from '../src/types/mcp-config.js';

/**
 * Mock MCP client config for claude-code
 */
export const mockClaudeCodeConfig: McpClientConfig = {
  name: 'claude-code',
  vendor: 'Anthropic',
  description: 'Claude Code CLI tool',
  docsUrl: 'https://docs.anthropic.com',
  configLocations: {
    macos: {
      user: '~/.claude.json',
      project: '.mcp.json',
    },
    windows: {
      user: '%USERPROFILE%\\.claude.json',
      project: '.mcp.json',
    },
    linux: {
      user: '~/.claude.json',
      project: '.mcp.json',
    },
  },
  configFormat: {
    wrapperKey: 'mcpServers',
    serverSchema: {
      command: { type: 'string', required: true },
      args: { type: 'array', required: true },
      env: { type: 'object', required: true },
    },
    format: 'json',
  },
  cli: { commands: 'claude' },
  scopes: ['user', 'project'],
  transportSupport: ['stdio'],
};

/**
 * Mock MCP client config for claude-desktop (user scope only)
 */
export const mockClaudeDesktopConfig: McpClientConfig = {
  name: 'claude-desktop',
  vendor: 'Anthropic',
  description: 'Claude Desktop App',
  configLocations: {
    macos: {
      user: '~/Library/Application Support/Claude/claude_desktop_config.json',
    },
    windows: {
      user: '%APPDATA%\\Claude\\claude_desktop_config.json',
    },
    linux: {
      user: '~/.config/Claude/claude_desktop_config.json',
    },
  },
  configFormat: {
    wrapperKey: 'mcpServers',
    serverSchema: {
      command: { type: 'string', required: true },
      args: { type: 'array', required: true },
      env: { type: 'object', required: true },
    },
    format: 'json',
  },
  scopes: ['user'],
  transportSupport: ['stdio'],
};

/**
 * Mock MCP client config for cursor
 */
export const mockCursorConfig: McpClientConfig = {
  name: 'cursor',
  vendor: 'Cursor',
  description: 'Cursor AI Editor',
  configLocations: {
    macos: {
      user: '~/.cursor/mcp.json',
      project: '.cursor/mcp.json',
    },
    windows: {
      user: '%USERPROFILE%\\.cursor\\mcp.json',
      project: '.cursor\\mcp.json',
    },
    linux: {
      user: '~/.cursor/mcp.json',
      project: '.cursor/mcp.json',
    },
  },
  configFormat: {
    wrapperKey: 'mcpServers',
    serverSchema: {
      command: { type: 'string', required: true },
      args: { type: 'array', required: true },
      env: { type: 'object', required: true },
    },
    format: 'json',
  },
  cli: { commands: 'cursor' },
  scopes: ['user', 'project'],
  transportSupport: ['stdio'],
};

/**
 * Mock detection result for detected tool
 */
export const mockDetectedTool: DetectionResult = {
  id: 'claude-code',
  name: 'claude-code',
  displayName: 'Anthropic claude-code',
  configPath: '/Users/test/.claude.json',
  configPaths: ['~/.claude.json', '.mcp.json'],
  detected: true,
  config: mockClaudeCodeConfig,
};

/**
 * Mock detection result for undetected tool
 */
export const mockUndetectedTool: DetectionResult = {
  id: 'cursor',
  name: 'cursor',
  displayName: 'Cursor cursor',
  configPath: null,
  configPaths: ['~/.cursor/mcp.json', '.cursor/mcp.json'],
  detected: false,
  config: mockCursorConfig,
};

/**
 * Mock detection result for claude-desktop (user scope only)
 */
export const mockClaudeDesktopTool: DetectionResult = {
  id: 'claude-desktop',
  name: 'claude-desktop',
  displayName: 'Anthropic claude-desktop',
  configPath: '/Users/test/Library/Application Support/Claude/claude_desktop_config.json',
  configPaths: ['~/Library/Application Support/Claude/claude_desktop_config.json'],
  detected: true,
  config: mockClaudeDesktopConfig,
};

/**
 * Array of mock detection results for testing
 */
export const mockDetectionResults: DetectionResult[] = [
  mockDetectedTool,
  mockUndetectedTool,
  mockClaudeDesktopTool,
];

/**
 * Mock credentials form for testing
 */
export const mockCredentials = {
  baseUrl: 'https://jira.example.com',
  username: 'testuser',
  password: 'testpass',
};
