/**
 * @file tools/issues.ts
 * @description Issue-related MCP tools for Jira.
 * Provides tools for creating, reading, updating, and deleting issues.
 */

import { z } from 'zod';
import { JiraClient } from '../client.js';

/**
 * Schema for get_issue tool input.
 */
export const getIssueSchema = z.object({
    issueKey: z.string().describe('The issue key (e.g., "PROJ-123") or ID'),
    fields: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to return'),
});

/**
 * Schema for create_issue tool input.
 */
export const createIssueSchema = z.object({
    projectKey: z.string().describe('The project key (e.g., "PROJ")'),
    summary: z.string().describe('Issue summary/title'),
    issueType: z
        .string()
        .default('Task')
        .describe('Issue type name (e.g., "Bug", "Task", "Story")'),
    description: z.string().optional().describe('Issue description'),
    assignee: z.string().optional().describe('Assignee username'),
    priority: z.string().optional().describe('Priority name (e.g., "High", "Medium")'),
    labels: z.array(z.string()).optional().describe('Array of labels'),
});

/**
 * Schema for update_issue tool input.
 */
export const updateIssueSchema = z.object({
    issueKey: z.string().describe('The issue key or ID to update'),
    summary: z.string().optional().describe('New summary'),
    description: z.string().optional().describe('New description'),
    assignee: z
        .string()
        .optional()
        .nullable()
        .describe('New assignee username (null to unassign)'),
    priority: z.string().optional().describe('New priority name'),
    labels: z.array(z.string()).optional().describe('New labels array'),
});

/**
 * Schema for delete_issue tool input.
 */
export const deleteIssueSchema = z.object({
    issueKey: z.string().describe('The issue key or ID to delete'),
    deleteSubtasks: z
        .boolean()
        .default(false)
        .describe('Whether to also delete subtasks'),
});

/**
 * Schema for add_comment tool input.
 */
export const addCommentSchema = z.object({
    issueKey: z.string().describe('The issue key or ID'),
    body: z.string().describe('Comment body text'),
});

/**
 * Schema for get_comments tool input.
 */
export const getCommentsSchema = z.object({
    issueKey: z.string().describe('The issue key or ID'),
});

/**
 * Creates issue tool handlers.
 * @param client - Jira client instance
 * @returns Object containing all issue tool handlers
 */
export function createIssueTools(client: JiraClient) {
    return {
        /**
         * Gets an issue by key or ID.
         */
        jira_get_issue: async (args: z.infer<typeof getIssueSchema>) => {
            const issue = await client.getIssue(args.issueKey, args.fields);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                key: issue.key,
                                id: issue.id,
                                summary: issue.fields.summary,
                                description: issue.fields.description,
                                status: issue.fields.status.name,
                                priority: issue.fields.priority?.name,
                                assignee: issue.fields.assignee?.displayName,
                                reporter: issue.fields.reporter?.displayName,
                                issueType: issue.fields.issuetype.name,
                                project: issue.fields.project.key,
                                labels: issue.fields.labels,
                                created: issue.fields.created,
                                updated: issue.fields.updated,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Creates a new issue.
         */
        jira_create_issue: async (args: z.infer<typeof createIssueSchema>) => {
            const result = await client.createIssue({
                project: { key: args.projectKey },
                summary: args.summary,
                issuetype: { name: args.issueType },
                description: args.description,
                assignee: args.assignee ? { name: args.assignee } : undefined,
                priority: args.priority ? { name: args.priority } : undefined,
                labels: args.labels,
            });
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                success: true,
                                key: result.key,
                                id: result.id,
                                self: result.self,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Updates an existing issue.
         */
        jira_update_issue: async (args: z.infer<typeof updateIssueSchema>) => {
            await client.updateIssue(args.issueKey, {
                summary: args.summary,
                description: args.description,
                assignee: args.assignee === null ? null : args.assignee ? { name: args.assignee } : undefined,
                priority: args.priority ? { name: args.priority } : undefined,
                labels: args.labels,
            });
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                success: true,
                                message: `Issue ${args.issueKey} updated successfully`,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Deletes an issue.
         */
        jira_delete_issue: async (args: z.infer<typeof deleteIssueSchema>) => {
            await client.deleteIssue(args.issueKey, args.deleteSubtasks);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                success: true,
                                message: `Issue ${args.issueKey} deleted successfully`,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Adds a comment to an issue.
         */
        jira_add_comment: async (args: z.infer<typeof addCommentSchema>) => {
            const comment = await client.addComment(args.issueKey, args.body);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                success: true,
                                commentId: comment.id,
                                author: comment.author.displayName,
                                created: comment.created,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        },

        /**
         * Gets comments on an issue.
         */
        jira_get_comments: async (args: z.infer<typeof getCommentsSchema>) => {
            const result = await client.getComments(args.issueKey);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(
                            {
                                total: result.total,
                                comments: result.comments.map((c) => ({
                                    id: c.id,
                                    author: c.author.displayName,
                                    body: c.body,
                                    created: c.created,
                                    updated: c.updated,
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
 * Tool definitions for issue-related operations.
 */
export const issueToolDefinitions = [
    {
        name: 'jira_get_issue',
        description: 'Get details of a Jira issue by its key or ID',
        inputSchema: {
            type: 'object' as const,
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'The issue key (e.g., "PROJ-123") or ID',
                },
                fields: {
                    type: 'string',
                    description: 'Comma-separated list of fields to return',
                },
            },
            required: ['issueKey'],
        },
    },
    {
        name: 'jira_create_issue',
        description: 'Create a new Jira issue',
        inputSchema: {
            type: 'object' as const,
            properties: {
                projectKey: {
                    type: 'string',
                    description: 'The project key (e.g., "PROJ")',
                },
                summary: {
                    type: 'string',
                    description: 'Issue summary/title',
                },
                issueType: {
                    type: 'string',
                    description: 'Issue type name (e.g., "Bug", "Task", "Story")',
                    default: 'Task',
                },
                description: {
                    type: 'string',
                    description: 'Issue description',
                },
                assignee: {
                    type: 'string',
                    description: 'Assignee username',
                },
                priority: {
                    type: 'string',
                    description: 'Priority name (e.g., "High", "Medium")',
                },
                labels: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of labels',
                },
            },
            required: ['projectKey', 'summary'],
        },
    },
    {
        name: 'jira_update_issue',
        description: 'Update an existing Jira issue',
        inputSchema: {
            type: 'object' as const,
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'The issue key or ID to update',
                },
                summary: {
                    type: 'string',
                    description: 'New summary',
                },
                description: {
                    type: 'string',
                    description: 'New description',
                },
                assignee: {
                    type: ['string', 'null'],
                    description: 'New assignee username (null to unassign)',
                },
                priority: {
                    type: 'string',
                    description: 'New priority name',
                },
                labels: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'New labels array',
                },
            },
            required: ['issueKey'],
        },
    },
    {
        name: 'jira_delete_issue',
        description: 'Delete a Jira issue',
        inputSchema: {
            type: 'object' as const,
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'The issue key or ID to delete',
                },
                deleteSubtasks: {
                    type: 'boolean',
                    description: 'Whether to also delete subtasks',
                    default: false,
                },
            },
            required: ['issueKey'],
        },
    },
    {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue',
        inputSchema: {
            type: 'object' as const,
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'The issue key or ID',
                },
                body: {
                    type: 'string',
                    description: 'Comment body text',
                },
            },
            required: ['issueKey', 'body'],
        },
    },
    {
        name: 'jira_get_comments',
        description: 'Get all comments on a Jira issue',
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
];
