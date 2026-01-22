#!/usr/bin/env bash
#
# @khanglvm/jira-mcp Interactive Installer
# 
# Quick install: curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh | bash
#
# This wrapper downloads and runs the OpenTUI-based installer
#

set -euo pipefail

readonly REPO_URL="https://github.com/khanglvm/jira-mcp"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
readonly C_RESET='\033[0m'
readonly C_ACCENT='\033[38;5;75m'
readonly C_SUCCESS='\033[38;5;114m'
readonly C_WARNING='\033[38;5;221m'
readonly C_ERROR='\033[38;5;204m'
readonly C_MUTED='\033[38;5;60m'

show_help() {
  cat <<EOF
${C_ACCENT}@khanglvm/jira-mcp Interactive Installer${C_RESET}

${C_MUTED}Usage:${C_RESET}
  curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh | bash

${C_MUTED}Or run locally:${C_RESET}
  ./scripts/install.sh

${C_MUTED}Requirements:${C_RESET}
  • Bun (recommended) or Node.js 18+

${C_MUTED}Supported Tools:${C_RESET}
  • Claude Desktop
  • Claude Code (CLI)
  • OpenCode

EOF
}

check_runtime() {
  if command -v bun &>/dev/null; then
    echo "bun"
  elif command -v node &>/dev/null; then
    local version=$(node -v | cut -d. -f1 | tr -d 'v')
    if [[ "$version" -ge 18 ]]; then
      echo "node"
    else
      echo ""
    fi
  else
    echo ""
  fi
}

install_bun_if_needed() {
  echo -e "${C_WARNING}Bun not found. Installing Bun...${C_RESET}"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo -e "${C_SUCCESS}✓ Bun installed${C_RESET}"
}

main() {
  # Handle --help
  if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
  fi

  # Check for runtime
  local runtime=$(check_runtime)
  
  if [[ -z "$runtime" ]]; then
    echo -e "${C_ERROR}Error: Bun or Node.js 18+ required.${C_RESET}"
    read -p "Install Bun now? [Y/n] " install_bun
    if [[ "${install_bun,,}" != "n" ]]; then
      install_bun_if_needed
      runtime="bun"
    else
      exit 1
    fi
  fi

  # Check if running from repo or via curl
  local tui_dir="$SCRIPT_DIR/tui"
  
  if [[ ! -d "$tui_dir" ]]; then
    # Running via curl - clone to temp directory
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    echo -e "${C_MUTED}Downloading installer...${C_RESET}"
    git clone --depth 1 --quiet "$REPO_URL" "$temp_dir"
    tui_dir="$temp_dir/scripts/tui"
  fi

  # Install dependencies if needed
  if [[ ! -d "$tui_dir/node_modules" ]]; then
    echo -e "${C_MUTED}Installing dependencies...${C_RESET}"
    (cd "$tui_dir" && $runtime install --silent 2>/dev/null || $runtime install)
  fi

  # Run the TUI
  (cd "$tui_dir" && $runtime run src/installer.tsx)
}

main "$@"
