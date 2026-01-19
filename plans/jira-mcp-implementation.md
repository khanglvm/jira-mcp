# Jira MCP Implementation Plan

## Overview

Create an npx-executable MCP (Model Context Protocol) package named `@lvmk/jira-mcp` that provides Jira tools with basic authentication support. The package will be compatible with Jira Server v7.x (specifically targeting v7.6.1 API compatibility).

**Remote Repository:** `git@github.com:stommazh/jira-mcp.git`

---

## Jira REST API Research Summary

### Authentication
- **Basic Authentication**: Uses HTTP Basic Auth with `Authorization: Basic <base64(username:password)>` header
- **Session-based**: POST to `/rest/auth/1/session` with `{"username": "...", "password": "..."}`
- For Jira Server (v7.x), basic auth with username/password is supported
- Base URL format: `http://host:port/context/rest/api/2/`

### Key API Endpoints (v7.6.1)

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Issues** | `/rest/api/2/issue` | POST | Create issue |
| | `/rest/api/2/issue/{issueIdOrKey}` | GET | Get issue |
| | `/rest/api/2/issue/{issueIdOrKey}` | PUT | Update issue |
| | `/rest/api/2/issue/{issueIdOrKey}` | DELETE | Delete issue |
| | `/rest/api/2/issue/{issueIdOrKey}/transitions` | GET/POST | Get/Do transitions |
| | `/rest/api/2/issue/{issueIdOrKey}/comment` | GET/POST | Get/Add comments |
| **Search** | `/rest/api/2/search` | GET/POST | JQL search |
| **Projects** | `/rest/api/2/project` | GET | List all projects |
| | `/rest/api/2/project/{projectIdOrKey}` | GET | Get project |
| **Users** | `/rest/api/2/user` | GET | Get user |
| | `/rest/api/2/myself` | GET | Get current user |
| **Session** | `/rest/auth/1/session` | GET | Get current session |

---

## MCP Configuration Research

### 1. Claude Code
**File locations:**
- User-level: `~/.claude.json`
- Project-level: `.mcp.json` (root of project)

**Format:**
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "user",
        "JIRA_PASSWORD": "password"
      }
    }
  }
}
```

### 2. OpenCode
**File location:** `~/.opencode.json` or `./.opencode.json`

**Format:**
```json
{
  "mcpServers": {
    "jira": {
      "type": "local",
      "command": ["npx", "-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "user",
        "JIRA_PASSWORD": "password"
      },
      "enabled": true
    }
  }
}
```

### 3. Google Antigravity
**File location:** `mcp_config.json` (via MCP Store or raw config edit)

**Format:**
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "user",
        "JIRA_PASSWORD": "password"
      }
    }
  }
}
```

### 4. Amp
**File location:** `.agents/commands/` or `~/.config/amp/commands/`

Uses `AGENTS.md` for project guidance. MCP configuration similar to Claude:
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "user",
        "JIRA_PASSWORD": "password"
      }
    }
  }
}
```

### 5. GitHub Copilot
**File location:** `.vscode/mcp.json` (project) or user `settings.json`

**Format:**
```json
{
  "servers": {
    "jira": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "user",
        "JIRA_PASSWORD": "password"
      }
    }
  }
}
```

### 6. Claude Desktop
**File locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Format:**
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@lvmk/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "http://jira.example.com:8080",
        "JIRA_USERNAME": "user",
        "JIRA_PASSWORD": "password"
      }
    }
  }
}
```

---

## Package Structure

```
jira-mcp/
├── package.json           # npm package config with bin entry
├── tsconfig.json          # TypeScript configuration
├── README.md              # Documentation with MCP configs
├── LICENSE                # MIT License
├── src/
│   ├── index.ts           # Entry point - MCP server setup
│   ├── config.ts          # Environment configuration
│   ├── client.ts          # Jira REST API client with basic auth
│   ├── tools/
│   │   ├── index.ts       # Tool exports
│   │   ├── issues.ts      # Issue-related tools
│   │   ├── search.ts      # JQL search tools
│   │   ├── projects.ts    # Project tools
│   │   ├── users.ts       # User tools
│   │   └── transitions.ts # Workflow transition tools
│   └── types/
│       ├── jira.ts        # Jira API types
│       └── mcp.ts         # MCP-specific types
├── dist/                  # Compiled output
├── docs/
│   └── mcp-configs.md     # MCP configuration samples
└── .github/
    └── workflows/
        └── publish.yml    # npm publish workflow
```

---

## Proposed Tools

### Issue Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `jira_get_issue` | Get issue details | `issueKey` |
| `jira_create_issue` | Create new issue | `projectKey`, `summary`, `issueType`, `description?`, `assignee?`, `priority?`, `labels?` |
| `jira_update_issue` | Update issue fields | `issueKey`, `summary?`, `description?`, `assignee?`, `priority?`, `labels?` |
| `jira_delete_issue` | Delete an issue | `issueKey` |
| `jira_add_comment` | Add comment to issue | `issueKey`, `body` |
| `jira_get_comments` | Get issue comments | `issueKey` |

### Search Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `jira_search` | Search issues via JQL | `jql`, `maxResults?`, `fields?` |

### Project Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `jira_list_projects` | List all projects | none |
| `jira_get_project` | Get project details | `projectKey` |

### Transition Tools  
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `jira_get_transitions` | Get available transitions | `issueKey` |
| `jira_transition_issue` | Transition issue to new status | `issueKey`, `transitionId`, `comment?` |

### User Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `jira_get_current_user` | Get authenticated user | none |
| `jira_get_user` | Get user by username | `username` |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | Yes | Jira server URL (e.g., `http://jira.example.com:8080`) |
| `JIRA_USERNAME` | Yes | Username for basic auth |
| `JIRA_PASSWORD` | Yes | Password for basic auth |
| `JIRA_API_VERSION` | No | API version, defaults to `2` |

---

## Technical Details

### Dependencies
- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `zod` - Schema validation
- `node-fetch` or native fetch - HTTP client

### Transport
- **stdio** - Standard input/output for CLI tools (npx execution)

---

## Verification Plan

### Automated Tests
1. Run `npm run build` to compile TypeScript
2. Run `npx @lvmk/jira-mcp --help` to verify CLI execution
3. Test with MCP Inspector if available

### Manual Verification
1. Configure in Claude Desktop and test connection
2. Verify tools appear in tool list
3. Test basic operations (get issue, search, etc.)

---

## Checklist

- [ ] Initialize npm package with TypeScript
- [ ] Set up git remote
- [ ] Implement Jira REST client with basic auth
- [ ] Implement MCP server with stdio transport
- [ ] Implement issue tools
- [ ] Implement search tools
- [ ] Implement project tools
- [ ] Implement transition tools
- [ ] Implement user tools
- [ ] Add comprehensive README with MCP configs
- [ ] Build and test locally
- [ ] Push to GitHub
