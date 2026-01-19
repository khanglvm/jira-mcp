# @lvmk/jira-mcp

MCP (Model Context Protocol) server providing Jira tools with **HTTP Basic Authentication** support. Specifically designed for **legacy self-hosted Jira Server** instances (v7.x and older) that only support basic authentication.

> **🔔 Using Jira Cloud or newer Jira Data Center?**
> 
> If you're using **Jira Cloud** or **Jira Data Center 8.14+** that supports Personal Access Tokens (PAT), OAuth, or API tokens, we recommend using [**mcp-atlassian**](https://github.com/sooperset/mcp-atlassian) instead. It provides broader authentication options and supports both Jira and Confluence.
>
> This package (`@lvmk/jira-mcp`) is specifically for legacy Jira Server deployments where basic auth (username/password) is the only available authentication method.

## Features

- 🔐 **Basic Authentication** - Username/password auth for legacy Jira Server
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

---

## ⚡ Quick CLI Setup

Automatically inject MCP configuration into your AI tool's config file with a single command:

```bash
npx @lvmk/jira-mcp setup -c <cli> -b <url> -u <user> -p <pass> [-s <scope>]
```

### Arguments

| Short | Long | Description |
|-------|------|-------------|
| `-c` | `--cli` | Target CLI tool (**required**) |
| `-b` | `--base-url` | Jira base URL (**required**) |
| `-u` | `--username` | Jira username (**required**) |
| `-p` | `--password` | Jira password (**required**) |
| `-s` | `--scope` | `user` or `project` (default: `user`) |

### Supported CLI Tools

| CLI Tool | Command | Config Locations |
|----------|---------|------------------|
| **Claude Code** | `claude-code` | `~/.claude.json` (user) / `.mcp.json` (project) |
| **Claude Desktop** | `claude-desktop` | `~/Library/Application Support/Claude/...` |
| **GitHub Copilot** | `copilot` | `~/.mcp.json` (user) / `.vscode/mcp.json` (project) |
| **Cursor** | `cursor` | `~/.cursor/mcp.json` (user) / `.cursor/mcp.json` (project) |
| **Windsurf** | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| **Roo Code** | `roo-code` | `~/.roo/mcp.json` (user) / `.roo/mcp.json` (project) |
| **Zed** | `zed` | `~/.config/zed/settings.json` |
| **Factory Droid** | `factory-droid` | `~/.factory/mcp.json` (user) / `.factory/mcp.json` (project) |

### Setup Examples

```bash
# Claude Code (user scope - available in all projects)
npx @lvmk/jira-mcp setup -c claude-code -b https://jira.example.com -u admin -p secret

# Cursor (project scope - only in current project)
npx @lvmk/jira-mcp setup -c cursor -b https://jira.example.com -u admin -p secret -s project

# GitHub Copilot (VS Code project config)
npx @lvmk/jira-mcp setup -c copilot -b https://jira.example.com -u admin -p secret -s project

# Claude Desktop
npx @lvmk/jira-mcp setup -c claude-desktop -b https://jira.example.com -u admin -p secret

# Factory Droid
npx @lvmk/jira-mcp setup -c factory-droid -b https://jira.example.com -u admin -p secret

# Windsurf
npx @lvmk/jira-mcp setup -c windsurf -b https://jira.example.com -u admin -p secret
```

### Other Commands

```bash
# Show help
npx @lvmk/jira-mcp --help

# List supported CLI tools
npx @lvmk/jira-mcp list-clis

# Show version
npx @lvmk/jira-mcp --version
```

---

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

## Development Guide

Want to fork and develop your own version? Here's everything you need to know.

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- A Jira Server instance for testing

### Getting Started

```bash
# Clone repository
git clone git@github.com:stommazh/jira-mcp.git
cd jira-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Project Structure

```
jira-mcp/
├── src/
│   ├── index.ts          # Main entry - CLI commands & MCP server
│   ├── config.ts         # Environment config with Zod validation
│   ├── client.ts         # Jira REST API client (Basic Auth)
│   ├── setup.ts          # CLI setup for AI tool configuration
│   └── tools/
│       ├── index.ts      # Tool exports
│       ├── issues.ts     # Issue CRUD & comments
│       ├── search.ts     # JQL search
│       ├── projects.ts   # Project listing
│       ├── transitions.ts # Workflow transitions
│       └── users.ts      # User info
├── test/
│   ├── client.test.ts    # Client integration tests
│   └── tools.test.ts     # Tool handler tests
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── tsconfig.test.json
```

### Environment Setup

Create a `.env` file in the project root:

```bash
JIRA_BASE_URL=https://your-jira-instance.com
JIRA_USERNAME=your-username
JIRA_PASSWORD=your-password
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode compilation |
| `npm run start` | Run compiled server |
| `npm run test:all` | Build and run all tests |
| `npm run test` | Run client tests only |
| `npm run test:tools` | Run tool handler tests only |
| `npm run clean` | Remove `dist/` and `dist-test/` |

### Running Locally

```bash
# Method 1: With environment variables
JIRA_BASE_URL=https://jira.example.com \
JIRA_USERNAME=admin \
JIRA_PASSWORD=secret \
node dist/index.js

# Method 2: With .env file (requires dotenv in your test)
npm run test:all
```

### Testing CLI Commands

```bash
# Show help
node dist/index.js --help

# Setup command help
node dist/index.js setup --help

# List supported CLIs
node dist/index.js list-clis

# Test setup (creates config in current directory)
node dist/index.js setup -c cursor -b https://jira.test.com -u test -p test -s project
```

### Adding New Tools

1. **Create tool file** in `src/tools/`:

```typescript
// src/tools/my-tool.ts
import { z } from 'zod';
import { JiraClient } from '../client.js';

export const myToolSchema = z.object({
  param1: z.string().describe('Description'),
});

export function createMyTools(client: JiraClient) {
  return {
    jira_my_tool: async (args: z.infer<typeof myToolSchema>) => {
      // Implementation
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  };
}

export const myToolDefinitions = [
  {
    name: 'jira_my_tool',
    description: 'Tool description',
    inputSchema: {
      type: 'object' as const,
      properties: { param1: { type: 'string', description: 'Description' } },
      required: ['param1'],
    },
  },
];
```

2. **Export from `src/tools/index.ts`**:

```typescript
export * from './my-tool.js';
```

3. **Register in `src/index.ts`**:

```typescript
import { createMyTools, myToolDefinitions } from './tools/index.js';

// In runMcpServer():
const myTools = createMyTools(jiraClient);

const allToolHandlers = {
  ...issueTools,
  ...myTools, // Add here
};

const allToolDefinitions = [
  ...issueToolDefinitions,
  ...myToolDefinitions, // Add here
];
```

### Adding Support for New CLI Tools

Edit `src/setup.ts` and add your CLI to the `configs` object in `getConfigFileInfo()`:

```typescript
'my-new-cli': {
  user: { path: path.join(home, '.my-cli', 'config.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
  project: { path: path.join(cwd, '.my-cli', 'config.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
},
```

Then add it to the `SupportedCli` type and `validClis` array.

### Publishing Your Fork

```bash
# Update package.json with your package name
npm version patch  # or minor/major

# Build and publish
npm run build
npm publish --access public
```

### MCP Protocol Notes

- Uses **stdio transport** for npx execution
- All tools return `{ content: [{ type: 'text', text: '...' }] }`
- Errors return `{ content: [...], isError: true }`
- Server logs go to `stderr` (not `stdout`) to avoid protocol interference

### Claude Code Lazy Loading (2025+)

Claude Code v2.1.7+ supports lazy tool loading via "Tool Search":
- Tools are discovered dynamically instead of pre-loaded
- Dramatically reduces context token usage (134k → ~5k tokens)
- No changes needed on MCP server side - it's handled by Claude Code

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT

