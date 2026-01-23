# @khanglvm/jira-mcp

MCP server for **legacy Jira Server** (v7.x) with Basic Authentication. Works with any MCP-compatible AI tool.

> **🔔 Using Jira Cloud or Data Center 8.14+?** Use [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) instead for OAuth/PAT support.

---

## 🚀 Quick Install

Run this single command to interactively configure Jira MCP for your AI tool:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh)
```

> **Note:** Uses process substitution (`<(...)`) instead of pipe to keep terminal interactive.

Supports: **Claude Desktop** | **Claude Code** | **OpenCode**

The installer auto-detects AI tools, safely merges config, and creates backups.

**CLI Mode:**
```bash
./scripts/install.sh --url https://jira.example.com
```

Run `./scripts/install.sh --help` for all options.

---

## 📦 Installation

### Quick Start

```bash
npx @khanglvm/jira-mcp
```

### Configuration Formats

<details>
<summary><strong>JSON (camelCase)</strong> - Claude Code, Antigravity, Cursor</summary>

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
</details>

<details>
<summary><strong>JSON (dash-case)</strong> - VS Code, GitHub Copilot</summary>

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
</details>

<details>
<summary><strong>YAML (Codex)</strong></summary>

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
</details>

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

<details>
<summary><h2>📖 Configuration Examples</h2></summary>

### Claude Desktop (macOS)

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Claude Code

**File:** `.mcp.json` (project) or `~/.claude.json` (user)

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

### OpenCode

**File:** `~/.opencode.json`

```json
{
  "mcpServers": {
    "jira": {
      "type": "local",
      "command": ["npx", "-y", "@khanglvm/jira-mcp"],
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

> **Other tools:** See [Configuration Formats](#-installation) section above for JSON/YAML variants.

</details>

---

<details>
<summary><h2>💡 Usage Examples</h2></summary>

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
```

### Transition an issue
```
1. jira_get_transitions with issueKey: "PROJ-123"
2. jira_transition_issue with issueKey: "PROJ-123", transitionId: "21"
```

</details>

---

<details>
<summary><h2>🛠️ Development Guide</h2></summary>

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Getting Started

```bash
git clone git@github.com:khanglvm/jira-mcp.git
cd jira-mcp
npm install
npm run build
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Watch mode |
| `npm run test:all` | Run all tests |
| `npm run test:integration` | Integration tests |
| `npm run clean` | Clean dist |

### Environment

Create `.env`:
```bash
JIRA_BASE_URL=https://your-jira.com
JIRA_USERNAME=your-username
JIRA_PASSWORD=your-password
```

### Adding New Tools

1. Create tool file in `src/tools/`
2. Export from `src/tools/index.ts`
3. Register in `src/index.ts`

### Adding CLI Support

Edit `src/setup.ts` and add to `configs` object in `getConfigFileInfo()`.

</details>

---

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open Pull Request

## License

MIT
