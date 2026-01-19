# @lvmk/jira-mcp

MCP (Model Context Protocol) server providing Jira tools with HTTP Basic Authentication support. Designed for Jira Server v7.x API compatibility.

## Features

- 🔐 **Basic Authentication** - Simple username/password auth for Jira Server
- 📋 **Issue Management** - Create, read, update, delete issues
- 🔍 **JQL Search** - Powerful issue search with JQL
- 📁 **Project Tools** - List and inspect projects
- 🔄 **Workflow Transitions** - Move issues through workflow states
- 👤 **User Information** - Get current and other user details

## Installation

```bash
npx @lvmk/jira-mcp
```

Or install globally:

```bash
npm install -g @lvmk/jira-mcp
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | ✅ | Base URL of Jira instance (e.g., `http://jira.example.com:8080`) |
| `JIRA_USERNAME` | ✅ | Username for authentication |
| `JIRA_PASSWORD` | ✅ | Password for authentication |
| `JIRA_API_VERSION` | ❌ | API version (default: `2`) |

## Available Tools

### Issue Tools

| Tool | Description |
|------|-------------|
| `jira_get_issue` | Get issue details by key |
| `jira_create_issue` | Create a new issue |
| `jira_update_issue` | Update issue fields |
| `jira_delete_issue` | Delete an issue |
| `jira_add_comment` | Add comment to issue |
| `jira_get_comments` | Get issue comments |

### Search Tools

| Tool | Description |
|------|-------------|
| `jira_search` | Search issues using JQL |

### Project Tools

| Tool | Description |
|------|-------------|
| `jira_list_projects` | List all accessible projects |
| `jira_get_project` | Get project details |

### Transition Tools

| Tool | Description |
|------|-------------|
| `jira_get_transitions` | Get available transitions for issue |
| `jira_transition_issue` | Transition issue to new status |

### User Tools

| Tool | Description |
|------|-------------|
| `jira_get_current_user` | Get authenticated user info |
| `jira_get_user` | Get user by username |

---

## MCP Configuration Examples

### Claude Code

**Project-level** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

**User-level** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

---

### OpenCode

**File:** `~/.opencode.json` or `./.opencode.json`

```json
{
  "mcpServers": {
    "jira": {
      "type": "local",
      "command": ["npx", "-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      },
      "enabled": true
    }
  }
}
```

---

### Google Antigravity

**File:** Custom MCP config (via MCP Store → "View raw config")

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

---

### Amp

**File:** Can be added via agent command or `AGENTS.md` reference

MCP configuration (same format as Claude):
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

---

### GitHub Copilot

**Project-level** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "jira": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

**User-level** (VS Code `settings.json`):
```json
{
  "github.copilot.chat.mcpServers": {
    "jira": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

---

### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

---

## Usage Examples

### Search for open bugs
```
Use jira_search with JQL: "project = PROJ AND issuetype = Bug AND status = Open"
```

### Create a new task
```
Use jira_create_issue with:
- projectKey: "PROJ"
- summary: "Implement new feature"
- issueType: "Task"
- description: "Details about the feature..."
```

### Transition an issue
```
1. Use jira_get_transitions with issueKey: "PROJ-123"
2. Use jira_transition_issue with:
   - issueKey: "PROJ-123"
   - transitionId: "21" (from step 1)
   - comment: "Moving to In Progress"
```

---

## Development

```bash
# Clone repository
git clone git@github.com:stommazh/jira-mcp.git
cd jira-mcp

# Install dependencies
npm install

# Build
npm run build

# Run locally
JIRA_BASE_URL=http://localhost:8080 \
JIRA_USERNAME=admin \
JIRA_PASSWORD=admin \
node dist/index.js
```

## License

MIT
