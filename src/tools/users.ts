/**
 * @file tools/users.ts
 * @description User-related MCP tools for Jira.
 */

import { z } from 'zod';
import { JiraClient } from '../client.js';

/**
 * Schema for get_user tool input.
 */
export const getUserSchema = z.object({
    username: z.string().describe('The username to look up'),
});

/**
 * Creates user tool handlers.
 * @param client - Jira client instance
 * @returns Object containing user tool handlers
 */
export function createUserTools(client: JiraClient) {
    return {
        /**
         * Gets the currently authenticated user.
         */
        jira_get_current_user: async () => {
            const user = await client.getCurrentUser();
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                name: user.name,
                                displayName: user.displayName,
                                emailAddress: user.emailAddress,
                                active: user.active,
                                timeZone: user.timeZone,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Gets a user by username.
         */
        jira_get_user: async (args: z.infer<typeof getUserSchema>) => {
            const user = await client.getUser(args.username);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                name: user.name,
                                displayName: user.displayName,
                                emailAddress: user.emailAddress,
                                active: user.active,
                                timeZone: user.timeZone,
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
 * Tool definitions for user operations.
 */
export const userToolDefinitions = [
    {
        name: 'jira_get_current_user',
        description: 'Get information about the currently authenticated Jira user',
        inputSchema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'jira_get_user',
        description: 'Get information about a Jira user by username',
        inputSchema: {
            type: 'object' as const,
            properties: {
                username: {
                    type: 'string',
                    description: 'The username to look up',
                },
            },
            required: ['username'],
        },
    },
];
