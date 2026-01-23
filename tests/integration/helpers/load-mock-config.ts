/**
 * @file load-mock-config.ts
 * @description Helper to load mock MCP config for testing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { McpConfigSchema } from '../../src/types/mcp-config.js';

/**
 * Cache for mock config to avoid repeated file reads
 */
let cachedMockConfig: McpConfigSchema | null = null;

/**
 * Load mock MCP config from fixtures
 */
export async function mockMcpConfig(): Promise<McpConfigSchema> {
  if (cachedMockConfig) {
    return cachedMockConfig;
  }

  const mockConfigPath = path.join(process.cwd(), 'tests', 'fixtures', 'mock-mcp-conf.json');
  const content = fs.readFileSync(mockConfigPath, 'utf-8');
  cachedMockConfig = JSON.parse(content) as McpConfigSchema;
  return cachedMockConfig;
}
