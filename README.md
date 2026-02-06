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

## 🚀 Quick Install (Recommended)

The fastest way to install is using **mcpm** (MCP Manager) - a universal installer that works with all AI agents:

```bash
npx @khanglvm/mcpm https://github.com/khanglvm/jira-mcp
```

**What this does:**
- Auto-detects your installed AI agents (Claude Desktop, Cursor, VS Code, etc.)
- Prompts for your Jira credentials securely
- Transforms config to match each agent's format
- Safely merges with existing configurations

### Alternative: Bash Script

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh)
```

---

## 🤖 For AI Agents

This repository includes a skill guide at `.agent/skills/jira-mcp-v7/SKILL.md` that provides:

- **Complete JQL reference** - operators, fields, functions, and date syntax
- **Critical gotchas** - `statusCategory` ("To Do") vs `status` vs `type` (Bug/Task)
- **Common patterns** - ready-to-use JQL queries
- **Workflow guidance** - how to use transitions correctly

**Key insight for AI agents:**
```
⚠️ "To Do" is a statusCategory, NOT an issue type!

❌ type = "To Do"              → ERROR: "value does not exist"
✅ statusCategory = "To Do"    → Works! Returns issues in "To Do" category
```

---

## 📦 Configuration Formats

### JSON (camelCase) - Claude Desktop, Claude Code, Antigravity, Cursor

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@khanglvm/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

### JSON (dash-case) - VS Code, GitHub Copilot

```json
{
  "servers": {
    "jira": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@khanglvm/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

### YAML (Codex)

```yaml
mcp_servers:
  jira:
    command: npx
    args:
      - -y
      - "@khanglvm/jira-mcp"
    env:
      JIRA_BASE_URL: http://jira.example.com:8080
      JIRA_USERNAME: your-username
      JIRA_PASSWORD: your-password
```

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
| `JIRA_BASE_URL` | ✅ | Jira instance URL |
| `JIRA_USERNAME` | ✅ | Username |
| `JIRA_PASSWORD` | ✅ | Password |
| `JIRA_API_VERSION` | ❌ | API version (default: `2`) |

---

## License

MIT
