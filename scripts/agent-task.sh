#!/usr/bin/env bash
# ==============================================================================
# Agent Git Task Manager Bash Wrapper
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/agent-task.js" "$@"
