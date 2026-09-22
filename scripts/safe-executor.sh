#!/usr/bin/env bash
# ==============================================================================
# Safe Executor Bash Wrapper
# Routes commands through the strict allowlist validator
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/safe-executor.js" "$@"
