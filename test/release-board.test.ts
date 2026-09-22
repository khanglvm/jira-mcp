import assert from 'node:assert/strict';
import { JiraClient, JiraIssue } from '../src/client.js';
import { parseReleaseBoardReference, readReleaseBoard } from '../src/release-board.js';
import { createReleaseTools, releaseToolDefinitions } from '../src/tools/releases.js';

function issue(key: string, subtasks: JiraIssue[] = []): JiraIssue {
    return {
        id: key.replace(/\D/g, ''),
        key,
        self: `https://jira.example/rest/api/2/issue/${key}`,
        fields: {
            summary: `Summary ${key}`,
            description: `Description ${key}`,
            status: { id: '1', name: 'Done', statusCategory: { name: 'Done' } } as never,
            priority: { id: '2', name: 'High' },
            assignee: { name: 'alice', displayName: 'Alice' },
            reporter: { name: 'reporter', displayName: 'Reporter' },
            issuetype: { id: '3', name: key === 'BRAN-11' ? 'Sub-task' : 'Story', subtask: key === 'BRAN-11' } as never,
            project: { key: 'BRAN', name: 'Branding' },
            created: '2026-09-01',
            updated: '2026-09-22',
            resolution: { name: 'Done' },
            resolutiondate: '2026-09-22',
            labels: [],
            components: [],
            fixVersions: [{ id: '12378', name: 'Release' }],
            subtasks,
        },
    };
}

function stubClient(): JiraClient {
    const child = issue('BRAN-11');
    return {
        getBaseUrl: () => 'https://jira.example',
        getVersion: async () => ({
            id: '12378',
            name: 'Release',
            description: 'Ship it',
            projectId: '10902',
            released: false,
            archived: false,
            releaseDate: '2026-09-22',
        }),
        getProject: async () => ({
            id: '10902',
            key: 'BRAN',
            name: 'Branding',
            self: 'https://jira.example/rest/api/2/project/10902',
        }),
        getVersionUnresolvedIssueCount: async () => ({ issuesUnresolvedCount: 0 }),
        getVersionRelatedIssueCounts: async () => ({ issuesFixedCount: 2, issuesAffectedCount: 0 }),
        search: async (_jql: string, _maxResults: number, startAt: number) => (
            startAt === 0
                ? { startAt: 0, maxResults: 1, total: 2, issues: [issue('BRAN-1', [child])] }
                : { startAt: 1, maxResults: 1, total: 2, issues: [issue('BRAN-2')] }
        ),
        getIssue: async () => child,
    } as unknown as JiraClient;
}

async function run(): Promise<void> {
    assert.deepEqual(
        parseReleaseBoardReference(
            'https://jira.example/projects/bran/versions/12378',
            'https://jira.example'
        ),
        {
            input: 'https://jira.example/projects/bran/versions/12378',
            versionId: '12378',
            projectKey: 'BRAN',
            url: 'https://jira.example/projects/bran/versions/12378',
        }
    );
    assert.throws(
        () => parseReleaseBoardReference('https://other.example/projects/BRAN/versions/12378', 'https://jira.example'),
        /does not match Jira profile/
    );

    const client = stubClient();
    const result = await readReleaseBoard(
        client,
        'https://jira.example/projects/BRAN/versions/12378',
        { pageSize: 1 }
    );
    assert.equal(result.release.project.key, 'BRAN');
    assert.deepEqual(result.counts, {
        direct: 2,
        children: 1,
        total: 3,
        unresolvedDirect: 0,
        affected: 0,
        byStatusCategory: { Done: 3 },
    });
    assert.deepEqual(result.issueKeys, ['BRAN-1', 'BRAN-2', 'BRAN-11']);
    assert.equal(result.completeness.complete, true);
    assert.equal(result.issues[0].children[0].key, 'BRAN-11');

    const definition = releaseToolDefinitions.find((tool) => tool.name === 'jira_get_release_board');
    assert.deepEqual(definition?.inputSchema.required, ['releaseBoard']);
    const tools = createReleaseTools(client);
    const output = JSON.parse((await tools.jira_get_release_board({ releaseBoard: '12378' })).content[0].text);
    assert.equal(output.release.id, '12378');
    assert.equal(output.counts.total, 3);
    console.log('Release board unit contract passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
