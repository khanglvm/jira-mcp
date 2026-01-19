/**
 * @file test/tools.test.ts
 * @description Integration tests for MCP tools.
 * Tests the tool handlers directly without MCP transport.
 * 
 * Run with: npm test
 */

import { config } from 'dotenv';
import { loadConfig } from '../src/config.js';
import { JiraClient } from '../src/client.js';
import { createIssueTools } from '../src/tools/issues.js';
import { createSearchTools } from '../src/tools/search.js';
import { createProjectTools } from '../src/tools/projects.js';
import { createTransitionTools } from '../src/tools/transitions.js';
import { createUserTools } from '../src/tools/users.js';

// Load environment variables
config();

/**
 * Test the MCP tool handlers.
 */
async function runToolTests(): Promise<void> {
    console.log('='.repeat(60));
    console.log('Jira MCP Tool Handler Tests');
    console.log('='.repeat(60));
    console.log();

    const jiraConfig = loadConfig();
    const client = new JiraClient(jiraConfig);

    // Create tool handlers
    const issueTools = createIssueTools(client);
    const searchTools = createSearchTools(client);
    const projectTools = createProjectTools(client);
    const transitionTools = createTransitionTools(client);
    const userTools = createUserTools(client);

    let passed = 0;
    let failed = 0;

    // Test: jira_get_current_user
    console.log('Testing: jira_get_current_user...');
    try {
        const result = await userTools.jira_get_current_user();
        const data = JSON.parse(result.content[0].text);
        console.log(`✅ jira_get_current_user - PASSED`);
        console.log(`   Response: ${result.content[0].text.substring(0, 100)}...`);
        passed++;
    } catch (error) {
        console.error(`❌ jira_get_current_user - FAILED:`, error);
        failed++;
    }
    console.log();

    // Test: jira_list_projects
    console.log('Testing: jira_list_projects...');
    try {
        const result = await projectTools.jira_list_projects();
        const data = JSON.parse(result.content[0].text);
        console.log(`✅ jira_list_projects - PASSED`);
        console.log(`   Found ${data.total} projects`);
        passed++;
    } catch (error) {
        console.error(`❌ jira_list_projects - FAILED:`, error);
        failed++;
    }
    console.log();

    // Test: jira_search
    console.log('Testing: jira_search...');
    try {
        const result = await searchTools.jira_search({
            jql: 'ORDER BY updated DESC',
            maxResults: 5,
            startAt: 0,
        });
        const data = JSON.parse(result.content[0].text);
        console.log(`✅ jira_search - PASSED`);
        console.log(`   Total: ${data.total}, Returned: ${data.issues.length}`);

        // Get first issue key for further tests
        if (data.issues.length > 0) {
            const issueKey = data.issues[0].key;

            // Test: jira_get_issue
            console.log();
            console.log(`Testing: jira_get_issue (${issueKey})...`);
            try {
                const issueResult = await issueTools.jira_get_issue({ issueKey });
                const issueData = JSON.parse(issueResult.content[0].text);
                console.log(`✅ jira_get_issue - PASSED`);
                console.log(`   Key: ${issueData.key}, Summary: ${issueData.summary?.substring(0, 40)}...`);
                passed++;
            } catch (error) {
                console.error(`❌ jira_get_issue - FAILED:`, error);
                failed++;
            }

            // Test: jira_get_comments
            console.log();
            console.log(`Testing: jira_get_comments (${issueKey})...`);
            try {
                const commentsResult = await issueTools.jira_get_comments({ issueKey });
                const commentsData = JSON.parse(commentsResult.content[0].text);
                console.log(`✅ jira_get_comments - PASSED`);
                console.log(`   Total comments: ${commentsData.total}`);
                passed++;
            } catch (error) {
                console.error(`❌ jira_get_comments - FAILED:`, error);
                failed++;
            }

            // Test: jira_get_transitions
            console.log();
            console.log(`Testing: jira_get_transitions (${issueKey})...`);
            try {
                const transResult = await transitionTools.jira_get_transitions({ issueKey });
                const transData = JSON.parse(transResult.content[0].text);
                console.log(`✅ jira_get_transitions - PASSED`);
                console.log(`   Available transitions: ${transData.transitions.length}`);
                passed++;
            } catch (error) {
                console.error(`❌ jira_get_transitions - FAILED:`, error);
                failed++;
            }
        }
        passed++;
    } catch (error) {
        console.error(`❌ jira_search - FAILED:`, error);
        failed++;
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Tool Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log();

    if (failed > 0) {
        process.exit(1);
    }
}

runToolTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
