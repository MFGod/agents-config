#!/usr/bin/env bash
# RTK preToolUse hook for Cursor — reads .rtk-active flag, delegates to rtk hook cursor.
# on  → rewrite Shell command via rtk hook cursor (returns updated_input)
# off → pass through (exit 0, no output)
# SYNC: keep logic in sync with .claude/hooks/rtk-rewrite.sh (differs only in "rtk hook claude")

RTK_FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.rtk-active"

[[ -L "$RTK_FLAG" ]] && exit 0
[[ ! -f "$RTK_FLAG" ]] && exit 0

RTK_MODE=$(head -c 8 -- "$RTK_FLAG" 2>/dev/null | tr -d '[:space:][:cntrl:]')

case "$RTK_MODE" in
  on) command -v rtk &>/dev/null && exec rtk hook cursor || exit 0 ;;
  *) exit 0 ;;
esac
