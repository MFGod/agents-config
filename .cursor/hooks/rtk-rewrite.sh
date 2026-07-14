#!/usr/bin/env bash
# RTK preToolUse hook for Cursor — reads .rtk-active flag, delegates to `rtk hook cursor`.
# on  → rewrite Shell command via `rtk hook cursor` (rtk emits Cursor's updated_input itself)
# off → pass through (exit 0, no output)
#
# NOT a mirror of .claude/hooks/rtk-rewrite.sh — the two intentionally differ:
#   Cursor: exec `rtk hook cursor`, which owns the whole protocol (parse → rewrite → respond).
#   Claude: calls `rtk rewrite` for the mapping only, then builds the PreToolUse JSON
#           (updatedInput / permissionDecision) itself, plus heredoc skip and audit logging.
# Keep the FLAG semantics in sync (same .rtk-active file, same on/off contract); the
# transport differs by harness.

RTK_FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.rtk-active"

[[ -L "$RTK_FLAG" ]] && exit 0
[[ ! -f "$RTK_FLAG" ]] && exit 0

RTK_MODE=$(head -c 8 -- "$RTK_FLAG" 2>/dev/null | tr -d '[:space:][:cntrl:]')

case "$RTK_MODE" in
  on) command -v rtk &>/dev/null && exec rtk hook cursor || exit 0 ;;
  *) exit 0 ;;
esac
