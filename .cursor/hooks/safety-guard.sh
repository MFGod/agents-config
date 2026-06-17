#!/usr/bin/env bash
# Cursor beforeShellExecution hook — delegates to safety-guard.js alongside this script.
# Requires node (Cursor's Electron runtime guarantees it).
# Falls through to fail-open if safety-guard.js not found or node unavailable.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/safety-guard.js" ]] && command -v node &>/dev/null; then
  exec node "$SCRIPT_DIR/safety-guard.js"
fi

# Fail-open: no JS implementation found — allow the command.
printf '{"permission":"allow"}'
