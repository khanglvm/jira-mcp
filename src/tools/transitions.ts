/**
 * @file tools/transitions.ts
 * @description Workflow transition tools for Jira MCP.
 */

import { z } from 'zod';
import { JiraClient } from '../client.js';

/**
 * Schema for get_transitions tool input.
 */
export const getTransitionsSchema = z.object({
    issueKey: z.string().describe('The issue key or ID'),
});

/**
 * Schema for transition_issue tool input.
 */
export const transitionIssueSchema = z.object({
    issueKey: z.string().describe('The issue key or ID'),
    transitionId: z.string().describe('The ID of the transition to execute'),
    comment: z.string().optional().describe('Optional comment to add during transition'),
});

/**
 * Creates transition tool handlers.
 * @param client - Jira client instance
 * @returns Object containing transition tool handlers
 */
export function createTransitionTools(client: JiraClient) {
    return {
        /**
         * Gets available transitions for an issue.
         */
        jira_get_transitions: async (args: z.infer<typeof getTransitionsSchema>) => {
            const result = await client.getTransitions(args.issueKey);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                issueKey: args.issueKey,
                                transitions: result.transitions.map((t) => ({
                                    id: t.id,
                                    name: t.name,
                                    toStatus: t.to.name,
                                    toStatusCategory: t.to.statusCategory.name,
                                })),
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Transitions an issue to a new status.
         */
        jira_transition_issue: async (args: z.infer<typeof transitionIssueSchema>) => {
            await client.transitionIssue(args.issueKey, args.transitionId, args.comment);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                success: true,
                                message: `Issue ${args.issueKey} transitioned successfully`,
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
 * Tool definitions for transition operations.
 */
export const transitionToolDefinitions = [
    {
        name: 'jira_get_transitions',
        description:
            'Get available workflow transitions for a Jira issue. Use this to find valid transition IDs before transitioning an issue.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'The issue key or ID',
                },
            },
            required: ['issueKey'],
        },
    },
    {
        name: 'jira_transition_issue',
        description:
            'Transition a Jira issue to a new status. First use jira_get_transitions to get valid transition IDs.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'The issue key or ID',
                },
                transitionId: {
                    type: 'string',
                    description: 'The ID of the transition to execute',
                },
                comment: {
                    type: 'string',
                    description: 'Optional comment to add during transition',
                },
            },
            required: ['issueKey', 'transitionId'],
        },
    },
];
