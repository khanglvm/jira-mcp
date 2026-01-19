/**
 * @file tools/search.ts
 * @description JQL search tool for Jira MCP.
 */

import { z } from 'zod';
import { JiraClient } from '../client.js';

/**
 * Schema for search tool input.
 */
export const searchSchema = z.object({
    jql: z.string().describe('JQL query string (e.g., "project = PROJ AND status = Open")'),
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Maximum number of results to return (1-100)'),
    startAt: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Starting index for pagination'),
    fields: z
        .array(z.string())
        .optional()
        .describe('Fields to include in results'),
});

/**
 * Creates search tool handlers.
 * @param client - Jira client instance
 * @returns Object containing search tool handler
 */
export function createSearchTools(client: JiraClient) {
    return {
        /**
         * Searches for issues using JQL.
         */
        jira_search: async (args: z.infer<typeof searchSchema>) => {
            const result = await client.search(
                args.jql,
                args.maxResults,
                args.startAt,
                args.fields
            );
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                total: result.total,
                                startAt: result.startAt,
                                maxResults: result.maxResults,
                                issues: result.issues.map((issue) => ({
                                    key: issue.key,
                                    summary: issue.fields.summary,
                                    status: issue.fields.status.name,
                                    assignee: issue.fields.assignee?.displayName,
                                    priority: issue.fields.priority?.name,
                                    issueType: issue.fields.issuetype.name,
                                })),
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },
    };
}

/**
 * Tool definitions for search operations.
 */
export const searchToolDefinitions = [
    {
        name: 'jira_search',
        description:
            'Search for Jira issues using JQL (Jira Query Language). Examples: "project = PROJ", "assignee = currentUser()", "status = Open"',
        inputSchema: {
            type: 'object' as const,
            properties: {
                jql: {
                    type: 'string',
                    description: 'JQL query string',
                },
                maxResults: {
                    type: 'number',
                    description: 'Maximum number of results to return (1-100)',
                    default: 50,
                },
                startAt: {
                    type: 'number',
                    description: 'Starting index for pagination',
                    default: 0,
                },
                fields: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Fields to include in results',
                },
            },
            required: ['jql'],
        },
    },
];
