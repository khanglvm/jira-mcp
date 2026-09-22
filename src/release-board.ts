import {
    JiraApiError,
    JiraClient,
    JiraIssue,
    JiraProject,
    JiraVersion,
} from './client.js';

export const RELEASE_ISSUE_FIELDS = [
    'summary',
    'description',
    'status',
    'priority',
    'assignee',
    'reporter',
    'issuetype',
    'project',
    'labels',
    'components',
    'fixVersions',
    'created',
    'updated',
    'resolution',
    'resolutiondate',
    'parent',
    'subtasks',
];

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_CHILD_CONCURRENCY = 6;
const MAX_RELEASE_ISSUES = 5000;

export interface ReleaseBoardReference {
    input: string;
    versionId: string;
    projectKey: string | null;
    url: string | null;
}

export interface ReleaseBoardIssue {
    key: string | null;
    id: string | null;
    relationship: 'direct' | 'child' | 'parent';
    parentKey: string | null;
    summary: string | null;
    description: string | null;
    issueType: string | null;
    subtask: boolean | null;
    status: string | null;
    statusCategory: string | null;
    resolution: string | null;
    priority: string | null;
    assignee: ReleaseBoardUser | null;
    reporter: ReleaseBoardUser | null;
    projectKey: string | null;
    labels: string[];
    components: string[];
    fixVersions: Array<{ id: string | null; name: string | null }>;
    created: string | null;
    updated: string | null;
    resolutionDate: string | null;
}

interface ReleaseBoardUser {
    name: string | null;
    key: string | null;
    displayName: string | null;
    active: boolean | null;
}

interface DirectReleaseIssue extends ReleaseBoardIssue {
    parent: ReleaseBoardIssue | null;
    children: ReleaseBoardIssue[];
}

interface ReleaseBoardClient extends Pick<JiraClient,
    'getBaseUrl' |
    'getVersion' |
    'getProject' |
    'getVersionUnresolvedIssueCount' |
    'getVersionRelatedIssueCounts' |
    'search' |
    'getIssue'> {}

type JiraObject = Record<string, any>;

function text(value: unknown): string | null {
    return value === undefined || value === null ? null : String(value);
}

function issueKeyCompare(left: { key: string | null }, right: { key: string | null }): number {
    return String(left.key || '').localeCompare(String(right.key || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

function userSummary(user: JiraObject | null | undefined): ReleaseBoardUser | null {
    if (!user) return null;
    return {
        name: text(user.name),
        key: text(user.key),
        displayName: text(user.displayName),
        active: user.active ?? null,
    };
}

function normalizeIssue(
    issue: Partial<JiraIssue> | JiraObject,
    relationship: ReleaseBoardIssue['relationship'],
    parentKey: string | null = null
): ReleaseBoardIssue {
    const fields = (issue?.fields || {}) as JiraObject;
    return {
        key: text(issue?.key),
        id: text(issue?.id),
        relationship,
        parentKey: text(fields.parent?.key || parentKey),
        summary: text(fields.summary),
        description: text(fields.description),
        issueType: text(fields.issuetype?.name),
        subtask: fields.issuetype?.subtask ?? null,
        status: text(fields.status?.name),
        statusCategory: text(fields.status?.statusCategory?.name),
        resolution: text(fields.resolution?.name),
        priority: text(fields.priority?.name),
        assignee: userSummary(fields.assignee),
        reporter: userSummary(fields.reporter),
        projectKey: text(fields.project?.key),
        labels: Array.isArray(fields.labels) ? fields.labels.map(String) : [],
        components: Array.isArray(fields.components)
            ? fields.components.map((item: JiraObject) => text(item?.name)).filter((item: string | null): item is string => Boolean(item))
            : [],
        fixVersions: Array.isArray(fields.fixVersions)
            ? fields.fixVersions.map((item: JiraObject) => ({ id: text(item?.id), name: text(item?.name) }))
            : [],
        created: text(fields.created),
        updated: text(fields.updated),
        resolutionDate: text(fields.resolutiondate),
    };
}

function errorSummary(error: unknown, details: Record<string, unknown>): Record<string, unknown> {
    const value = error as Error & { statusCode?: number };
    return {
        ...details,
        statusCode: value?.statusCode ?? null,
        error: value?.name || 'Error',
        message: value?.message || String(error),
    };
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await mapper(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}

export function parseReleaseBoardReference(reference: string, expectedBaseUrl?: string): ReleaseBoardReference {
    const value = String(reference || '').trim();
    if (/^\d+$/.test(value)) {
        return { input: value, versionId: value, projectKey: null, url: null };
    }

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error('releaseBoard must be a Jira version URL or numeric version id');
    }
    if (!/^https?:$/.test(url.protocol)) {
        throw new Error('releaseBoard URL must use http or https');
    }
    if (expectedBaseUrl) {
        const expected = new URL(expectedBaseUrl);
        if (url.origin !== expected.origin) {
            throw new Error(`releaseBoard host ${url.origin} does not match Jira profile ${expected.origin}`);
        }
    }
    const match = url.pathname.match(/\/projects\/([^/]+)\/versions\/(\d+)\/?$/i);
    if (!match) {
        throw new Error('releaseBoard URL must match /projects/<project-key>/versions/<version-id>');
    }
    return {
        input: value,
        versionId: match[2],
        projectKey: decodeURIComponent(match[1]).toUpperCase(),
        url: url.toString(),
    };
}

async function readDirectIssues(
    client: ReleaseBoardClient,
    projectKey: string,
    versionId: string,
    pageSize: number
): Promise<{ issues: JiraIssue[]; total: number; pages: number }> {
    const issues: JiraIssue[] = [];
    let startAt = 0;
    let total: number | null = null;
    let pages = 0;
    const jql = `project = "${projectKey.replace(/"/g, '\\"')}" AND fixVersion = ${versionId} ORDER BY key ASC`;
    while (total === null || startAt < total) {
        const page = await client.search(jql, pageSize, startAt, RELEASE_ISSUE_FIELDS);
        const pageIssues = Array.isArray(page?.issues) ? page.issues : [];
        total = Number(page?.total ?? pageIssues.length);
        pages += 1;
        if (total > MAX_RELEASE_ISSUES) {
            throw new Error(`Release board contains ${total} direct issues; limit is ${MAX_RELEASE_ISSUES}`);
        }
        if (pageIssues.length === 0 && startAt < total) {
            throw new Error(`Jira returned an empty release page at ${startAt} of ${total}`);
        }
        issues.push(...pageIssues);
        startAt += pageIssues.length;
    }
    return { issues, total: total || 0, pages };
}

function releaseSummary(version: JiraVersion, project: JiraProject, reference: ReleaseBoardReference, baseUrl: string) {
    return {
        id: text(version.id),
        name: text(version.name),
        description: text(version.description),
        project: { id: text(project.id), key: text(project.key), name: text(project.name) },
        startDate: text(version.startDate),
        releaseDate: text(version.releaseDate),
        released: version.released ?? false,
        archived: version.archived ?? false,
        overdue: version.overdue ?? null,
        url: `${baseUrl.replace(/\/$/, '')}/projects/${encodeURIComponent(project.key)}/versions/${encodeURIComponent(version.id)}` || reference.url,
    };
}

export async function readReleaseBoard(
    client: ReleaseBoardClient,
    releaseBoard: string,
    options: { pageSize?: number; childConcurrency?: number } = {}
) {
    const pageSize = Math.max(1, Math.min(Number(options.pageSize) || DEFAULT_PAGE_SIZE, 1000));
    const childConcurrency = Math.max(1, Math.min(Number(options.childConcurrency) || DEFAULT_CHILD_CONCURRENCY, 20));
    const reference = parseReleaseBoardReference(releaseBoard, client.getBaseUrl());
    const version = await client.getVersion(reference.versionId);
    const [project, unresolvedCounts, relatedCounts] = await Promise.all([
        client.getProject(String(version.projectId)),
        client.getVersionUnresolvedIssueCount(reference.versionId),
        client.getVersionRelatedIssueCounts(reference.versionId),
    ]);
    const projectKey = text(project?.key)?.toUpperCase();
    if (!projectKey) throw new Error(`Jira version ${reference.versionId} has no readable project`);
    if (reference.projectKey && reference.projectKey !== projectKey) {
        throw new Error(`Release board project ${reference.projectKey} does not match Jira version project ${projectKey}`);
    }

    const direct = await readDirectIssues(client, projectKey, reference.versionId, pageSize);
    const requested = new Map<string, { parentKey: string; issue: JiraIssue }>();
    for (const issue of direct.issues) {
        const subtasks = ((issue.fields as JiraObject).subtasks || []) as JiraIssue[];
        for (const child of subtasks) {
            if (child?.key && !requested.has(child.key)) requested.set(child.key, { parentKey: issue.key, issue: child });
        }
    }
    const childRequests = [...requested.values()].sort((left, right) => issueKeyCompare(left.issue, right.issue));
    const childErrors: Array<Record<string, unknown>> = [];
    const children = await mapConcurrent(childRequests, childConcurrency, async ({ parentKey, issue }) => {
        try {
            return normalizeIssue(await client.getIssue(issue.key, RELEASE_ISSUE_FIELDS.join(',')), 'child', parentKey);
        } catch (error) {
            childErrors.push(errorSummary(error, { parentKey, issueKey: issue.key, phase: 'child_hydration' }));
            return normalizeIssue(issue, 'child', parentKey);
        }
    });

    const childrenByParent = new Map<string, ReleaseBoardIssue[]>();
    for (const child of children) {
        if (!child.parentKey) continue;
        const values = childrenByParent.get(child.parentKey) || [];
        values.push(child);
        childrenByParent.set(child.parentKey, values);
    }
    const issues: DirectReleaseIssue[] = direct.issues.map((issue) => {
        const fields = issue.fields as JiraObject;
        return {
            ...normalizeIssue(issue, 'direct'),
            parent: fields.parent ? normalizeIssue(fields.parent, 'parent') : null,
            children: (childrenByParent.get(issue.key) || []).sort(issueKeyCompare),
        };
    }).sort(issueKeyCompare);
    const allIssues: ReleaseBoardIssue[] = [...issues, ...children];
    const byStatusCategory: Record<string, number> = {};
    for (const issue of allIssues) {
        const category = issue.statusCategory || 'Unknown';
        byStatusCategory[category] = (byStatusCategory[category] || 0) + 1;
    }
    const expectedFixed = Number(relatedCounts.issuesFixedCount ?? direct.total);
    const errors = [...childErrors];
    if (expectedFixed !== direct.total) {
        errors.push({
            phase: 'membership_count',
            expected: expectedFixed,
            returned: direct.total,
            message: 'Jira related issue count differs from the paginated fixVersion search',
        });
    }
    return {
        source: reference,
        release: releaseSummary(version, project, reference, client.getBaseUrl()),
        counts: {
            direct: direct.total,
            children: children.length,
            total: allIssues.length,
            unresolvedDirect: Number(unresolvedCounts.issuesUnresolvedCount ?? 0),
            affected: Number(relatedCounts.issuesAffectedCount ?? 0),
            byStatusCategory,
        },
        issues,
        issueKeys: [...new Set(allIssues.flatMap((issue) => [issue.key, issue.parentKey]).filter((key): key is string => Boolean(key)))]
            .sort((left, right) => issueKeyCompare({ key: left }, { key: right })),
        completeness: {
            complete: errors.length === 0,
            directIssuePages: direct.pages,
            childrenRequested: childRequests.length,
            childrenHydrated: childRequests.length - childErrors.length,
            errors,
        },
    };
}

export { JiraApiError };
