# @khanglvm/jira-mcp

MCP server for **legacy Jira Server** (v7.x) with Basic Authentication. Works with any MCP-compatible AI tool.

> **🔔 Using Jira Cloud or Data Center 8.14+?** Use [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) instead for OAuth/PAT support.

---

## 📋 Prerequisites

**Node.js** (v18+) is required for MCP servers and the installer to work.

**macOS / Linux:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

**Windows (PowerShell):**
```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

---

## 🚀 Quick Install

Install using **mcpm** (MCP Manager) - a universal installer that works with all AI agents:

```bash
npx @khanglvm/mcpm https://github.com/khanglvm/jira-mcp
```

**What this does:**
- Auto-detects your installed AI agents (Claude Desktop, Cursor, VS Code, etc.)
- Prompts for your Jira credentials securely
- Transforms config to match each agent's format
- Safely merges with existing configurations

---

## 🤖 For AI Agents

> **⚠️ IMPORTANT:** AI agents MUST NOT use the Quick Install command above. Instead, follow the automated installation workflow below to ensure proper configuration and agent compatibility.

### MCP Installation Workflow

**REQUIRED:** Read and follow the [MCP Server Installation Workflow](https://raw.githubusercontent.com/khanglvm/agent-tools/refs/heads/main/.agent/workflows/install-mcp-server.md) to install this MCP server. This workflow handles:
- Automatic agent detection and configuration
- Secure credential collection
- Proper config format transformation for your specific agent

### Agent Skill

**REQUIRED:** Read the agent skill at [`.agent/skills/jira-mcp-v7/SKILL.md`](./.agent/skills/jira-mcp-v7/SKILL.md) before using Jira tools. It provides:

- **Complete JQL reference** - operators, fields, functions, and date syntax
- **Critical gotchas** - `statusCategory` ("To Do") vs `status` vs `type` (Bug/Task)
- **Common patterns** - ready-to-use JQL queries
- **Workflow guidance** - how to use transitions correctly

---

## 🔧 Available Tools

| Tool | Description |
|------|-------------|
| `jira_get_issue` | Get issue details by key |
| `jira_create_issue` | Create a new issue |
| `jira_update_issue` | Update issue fields |
| `jira_delete_issue` | Delete an issue |
| `jira_add_comment` | Add comment to issue |
| `jira_get_comments` | Get issue comments |
| `jira_search` | Search issues using JQL |
| `jira_list_projects` | List all accessible projects |
| `jira_get_project` | Get project details |
| `jira_get_transitions` | Get available transitions |
| `jira_transition_issue` | Transition issue to new status |
| `jira_get_current_user` | Get authenticated user info |
| `jira_get_user` | Get user by username |

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | yes | Jira instance URL |
| `JIRA_USERNAME` | yes | Username |
| `JIRA_PASSWORD` | yes | Password |
| `JIRA_API_VERSION` | no | API version (default: `2`) |

## 📜 Changelog

### v1.4.0
- `feat`: add `mcp.json` for `mcpm` tool support
- `feat`: improve tool descriptions with JQL gotchas and add AI agent skill
- `fix`: add `.mjs` extension for Node.js ESM compatibility in temporary files
- `docs`: add `mcpm` quick install instructions and AI agent skill reference

---

## License

MIT
