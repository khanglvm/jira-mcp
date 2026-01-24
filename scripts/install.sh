#!/usr/bin/env bash
#
# @khanglvm/jira-mcp Interactive Installer
#
# Quick install (process substitution for interactive TUI):
#   bash <(curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh)
#
# This wrapper downloads and runs the pure JavaScript installer
# Requires: Node.js >= 18
#

set -eo pipefail

readonly REPO_RAW_URL="https://raw.githubusercontent.com/khanglvm/jira-mcp/main"
readonly MIN_NODE_VERSION="18"

# Detect if running via pipe (curl | bash) - BASH_SOURCE is empty in this case
# shellcheck disable=SC2128
if [[ -z "${BASH_SOURCE:-}" ]] || [[ ! -f "${BASH_SOURCE:-}" ]]; then
  readonly IS_PIPED=true
  readonly SCRIPT_DIR=""
else
  readonly IS_PIPED=false
  readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# Colors (Tokyo Night theme)
readonly C_RESET='\033[0m'
readonly C_ACCENT='\033[38;5;75m'
readonly C_SUCCESS='\033[38;5;114m'
readonly C_WARNING='\033[38;5;221m'
readonly C_ERROR='\033[38;5;204m'
readonly C_MUTED='\033[38;5;60m'

show_help() {
  cat <<EOF
${C_ACCENT}@khanglvm/jira-mcp Interactive Installer${C_RESET}

${C_MUTED}USAGE:${C_RESET}
  ./scripts/install.sh [OPTIONS]

${C_MUTED}OPTIONS:${C_RESET}
  --url <URL>     Pre-fill Jira base URL (e.g., https://jira.example.com:8080)
                  User will still be prompted for username/password
  -h, --help      Show this help message

${C_MUTED}EXAMPLES:${C_RESET}
  # Interactive mode (default)
  ./scripts/install.sh

  # Pre-fill Jira URL
  ./scripts/install.sh --url https://jira.example.com

  # Remote install with URL
  bash <(curl -fsSL ${REPO_RAW_URL}/scripts/install.sh) --url https://jira.example.com

${C_MUTED}REQUIREMENTS:${C_RESET}
  • Node.js >= ${MIN_NODE_VERSION}

${C_MUTED}Supported Tools:${C_RESET}
  • Claude Desktop
  • Claude Code (CLI)
  • OpenCode
  • Cursor
  • Windsurf

${C_MUTED}For more info:${C_RESET} https://github.com/khanglvm/jira-mcp
EOF
}

check_node() {
  if command -v node &>/dev/null; then
    local version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [[ "$version" -ge "$MIN_NODE_VERSION" ]]; then
      echo "true"
      return
    fi
  fi
  echo "false"
}

# Global variable for CLI argument
JIRA_URL=""

main() {
  # Parse command-line arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --url)
        if [[ -z "${2:-}" ]] || [[ "${2:-}" == --* ]]; then
          echo -e "${C_ERROR}Error: --url requires a value${C_RESET}"
          show_help
          exit 1
        fi
        JIRA_URL="$2"
        shift 2
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        echo -e "${C_ERROR}Unknown option: $1${C_RESET}"
        show_help
        exit 1
        ;;
    esac
  done

  # Validate URL format if provided - if invalid, just warn and clear (let user input manually)
  if [[ -n "$JIRA_URL" ]]; then
    if [[ ! "$JIRA_URL" =~ ^https?://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]+)?(/.*)?$ ]]; then
      echo -e "${C_WARNING}⚠ Invalid URL format, will prompt for input${C_RESET}"
      JIRA_URL=""
    else
      echo -e "${C_SUCCESS}✓ Using Jira URL: ${C_RESET}$JIRA_URL"
    fi
  fi

  # Check Node.js
  local has_node=$(check_node)
  
  if [[ "$has_node" == "false" ]]; then
    echo -e "${C_ERROR}Error: Node.js >= ${MIN_NODE_VERSION} is required${C_RESET}"
    echo -e "${C_MUTED}Install from: https://nodejs.org${C_RESET}"
    echo -e "${C_MUTED}Or use nvm: nvm install ${MIN_NODE_VERSION}${C_RESET}"
    exit 1
  fi

  # Determine installer location
  local installer_script=""
  local temp_file=""
  
  if [[ "$IS_PIPED" == "true" ]] || [[ -z "$SCRIPT_DIR" ]] || [[ ! -f "$SCRIPT_DIR/installer.mjs" ]]; then
    # Running via curl or installer not found locally - download to temp
    temp_file=$(mktemp)
    trap "rm -f $temp_file" EXIT
    
    echo -e "${C_MUTED}Downloading installer...${C_RESET}"
    curl -fsSL "${REPO_RAW_URL}/scripts/installer.mjs" -o "$temp_file"
    installer_script="$temp_file"
  else
    # Running from local repo
    installer_script="$SCRIPT_DIR/installer.mjs"
  fi

  # Export URL for installer if provided
  if [[ -n "$JIRA_URL" ]]; then
    export JIRA_MCP_URL="$JIRA_URL"
  fi

  # Run the installer with proper TTY allocation
  # When running via pipe (curl | bash), stdin AND stdout may not be TTY
  if [[ ! -t 0 ]] || [[ ! -t 1 ]]; then
    # Redirect both stdin and stdout from/to /dev/tty
    node "$installer_script" < /dev/tty > /dev/tty
  else
    node "$installer_script"
  fi
}

main "$@"
