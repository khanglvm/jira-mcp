import { z } from 'zod';
import { JiraClient } from '../client.js';
import { readReleaseBoard } from '../release-board.js';

const releaseBoardSchema = z.object({
    releaseBoard: z.string().min(1),
});

export function createReleaseTools(client: JiraClient) {
    return {
        jira_get_release_board: async (args: z.infer<typeof releaseBoardSchema>) => {
            const input = releaseBoardSchema.parse(args);
            const result = await readReleaseBoard(client, input.releaseBoard);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        },
    };
}

export const releaseToolDefinitions = [
    {
        name: 'jira_get_release_board',
        description: `Get a complete Jira release board from a project version URL or numeric version id.
Use this when the user gives a /projects/<key>/versions/<id> link or asks which issues belong to a release.
Returns release metadata, every directly assigned issue, hydrated Jira subtasks, counts, and completeness evidence.
Preserves non-frontend issues so the caller can classify scope without guessing from ticket names.`,
        inputSchema: {
            type: 'object' as const,
            properties: {
                releaseBoard: {
                    type: 'string',
                    description: 'Jira project version URL or numeric version id',
                },
            },
            required: ['releaseBoard'],
        },
    },
];
