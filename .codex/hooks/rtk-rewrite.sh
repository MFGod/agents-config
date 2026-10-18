#!/usr/bin/env bash
# rtk-hook-version: 3
# RTK PreToolUse hook — reads .rtk-active flag, rewrites via `rtk rewrite`.
# on  → delegate to rtk rewrite (auto-allow / ask / deny protocol)
# off → pass through without modification (exit 0)
# SYNC: keep logic in sync with .cursor/hooks/rtk-rewrite.sh (differs only in agent name)

# --- Audit logging (opt-in via RTK_HOOK_AUDIT=1) ---
_rtk_audit_log() {
  if [ "${RTK_HOOK_AUDIT:-0}" != "1" ]; then return; fi
  local action="$1" original="$2" rewritten="${3:--}"
  local dir="${RTK_AUDIT_DIR:-${HOME}/.local/share/rtk}"
  mkdir -p "$dir"
  printf '%s | %s | %s | %s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$action" "$original" "$rewritten" \
    >> "${dir}/hook-audit.log"
}

RTK_FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.rtk-active"

# Refuse symlinks; skip if file absent
[[ -L "$RTK_FLAG" ]] && exit 0
[[ ! -f "$RTK_FLAG" ]] && exit 0

RTK_MODE=$(head -c 8 -- "$RTK_FLAG" 2>/dev/null | tr -d '[:space:][:cntrl:]')

[[ "$RTK_MODE" != "on" ]] && exit 0

# Guards: skip silently if dependencies missing
if ! command -v rtk &>/dev/null || ! command -v jq &>/dev/null; then
  _rtk_audit_log "skip:no_deps" "-"
  exit 0
fi

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$CMD" ]; then
  _rtk_audit_log "skip:empty" "-"
  exit 0
fi

# Skip heredocs
case "$CMD" in
  *'<<'*) _rtk_audit_log "skip:heredoc" "$CMD"; exit 0 ;;
esac

# Rewrite via rtk — single source of truth for all command mappings and permission checks.
EXIT_CODE=0
REWRITTEN=$(rtk rewrite "$CMD" 2>/dev/null) || EXIT_CODE=$?

case $EXIT_CODE in
  0)
    if [ "$CMD" = "$REWRITTEN" ]; then
      _rtk_audit_log "skip:already_rtk" "$CMD"
      exit 0
    fi
    ;;
  1)
    _rtk_audit_log "skip:no_match" "$CMD"
    exit 0
    ;;
  2)
    _rtk_audit_log "skip:deny_rule" "$CMD"
    exit 0
    ;;
  3)
    ;;
  *)
    exit 0
    ;;
esac

_rtk_audit_log "rewrite" "$CMD" "$REWRITTEN"

ORIGINAL_INPUT=$(echo "$INPUT" | jq -c '.tool_input')
UPDATED_INPUT=$(echo "$ORIGINAL_INPUT" | jq --arg cmd "$REWRITTEN" '.command = $cmd')

if [ "$EXIT_CODE" -eq 3 ]; then
  jq -n \
    --argjson updated "$UPDATED_INPUT" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "updatedInput": $updated
      }
    }'
else
  jq -n \
    --argjson updated "$UPDATED_INPUT" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "permissionDecisionReason": "RTK auto-rewrite",
        "updatedInput": $updated
      }
    }'
fi
