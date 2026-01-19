#!/usr/bin/env node
/**
 * @file index.ts
 * @description Main entry point for the Jira MCP server.
 * Sets up the MCP server with stdio transport and registers all Jira tools.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { JiraClient, JiraApiError } from './client.js';
import {
    createIssueTools,
    issueToolDefinitions,
    createSearchTools,
    searchToolDefinitions,
    createProjectTools,
    projectToolDefinitions,
    createTransitionTools,
    transitionToolDefinitions,
    createUserTools,
    userToolDefinitions,
} from './tools/index.js';

/**
 * Package information for server identification.
 */
const SERVER_INFO = {
    name: '@lvmk/jira-mcp',
    version: '1.0.0',
};

/**
 * Main function to initialize and run the MCP server.
 */
async function main(): Promise<void> {
    // Load and validate configuration from environment
    let config;
    try {
        config = loadConfig();
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }

    // Initialize Jira client
    const jiraClient = new JiraClient(config);

    // Create tool handlers
    const issueTools = createIssueTools(jiraClient);
    const searchTools = createSearchTools(jiraClient);
    const projectTools = createProjectTools(jiraClient);
    const transitionTools = createTransitionTools(jiraClient);
    const userTools = createUserTools(jiraClient);

    // Combine all tool handlers with type assertion 
    // Individual handlers have stricter param types, but we know the SDK will provide correct args
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allToolHandlers: Record<string, (args: any) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
        ...issueTools,
        ...searchTools,
        ...projectTools,
        ...transitionTools,
        ...userTools,
    };

    // Combine all tool definitions
    const allToolDefinitions = [
        ...issueToolDefinitions,
        ...searchToolDefinitions,
        ...projectToolDefinitions,
        ...transitionToolDefinitions,
        ...userToolDefinitions,
    ];

    // Create MCP server
    const server = new Server(SERVER_INFO, {
        capabilities: {
            tools: {},
        },
    });

    // Register list_tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: allToolDefinitions,
        };
    });

    // Register call_tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        const handler = allToolHandlers[name];
        if (!handler) {
            throw new Error(`Unknown tool: ${name}`);
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await handler(args as any);
        } catch (error) {
            // Handle Jira API errors gracefully
            if (error instanceof JiraApiError) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    error: true,
                                    message: error.message,
                                    statusCode: error.statusCode,
                                    details: error.body,
                                },
                                null,
                                2
                            ),
                        },
                    ],
                    isError: true,
                };
            }

            // Re-throw unexpected errors
            throw error;
        }
    });

    // Create stdio transport and connect
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log successful startup to stderr (not stdout, to avoid interfering with MCP protocol)
    console.error(`Jira MCP server started - connected to ${config.JIRA_BASE_URL}`);
}

// Run the server
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
