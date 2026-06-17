#!/usr/bin/env bash
# RTK PreToolUse hook — reads .rtk-active flag, delegates to rtk hook claude.
# on  → rewrite Bash command via rtk hook claude
# off → pass through without modification (exit 0)
# SYNC: keep logic in sync with .cursor/hooks/rtk-rewrite.sh (differs only in "rtk hook cursor")

RTK_FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.rtk-active"

# Refuse symlinks; skip if file absent
[[ -L "$RTK_FLAG" ]] && exit 0
[[ ! -f "$RTK_FLAG" ]] && exit 0

RTK_MODE=$(head -c 8 -- "$RTK_FLAG" 2>/dev/null | tr -d '[:space:][:cntrl:]')

case "$RTK_MODE" in
  on)    command -v rtk &>/dev/null && exec rtk hook claude || exit 0 ;;
  *)     exit 0 ;;
esac
