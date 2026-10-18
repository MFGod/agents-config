#!/usr/bin/env bash
# Stop hook — warn about uncommitted changes at end of session

set -euo pipefail

input=$(cat)

cwd=$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).cwd||'')}catch(e){}" -- "$input" 2>/dev/null || true)
[[ -z "$cwd" ]] && cwd="$PWD"

if ! git -C "$cwd" rev-parse --git-dir &>/dev/null 2>&1; then
  exit 0
fi

staged=$(git -C "$cwd" diff --cached --name-only 2>/dev/null)
unstaged=$(git -C "$cwd" diff --name-only 2>/dev/null)
untracked=$(git -C "$cwd" ls-files --others --exclude-standard 2>/dev/null)

if [[ -z "$staged" && -z "$unstaged" && -z "$untracked" ]]; then
  exit 0
fi

msg="Uncommitted changes at session end:"$'\n'
if [[ -n "$staged" ]]; then
  msg+="  staged:"$'\n'
  while IFS= read -r f; do msg+="    $f"$'\n'; done <<< "$staged"
fi
if [[ -n "$unstaged" ]]; then
  msg+="  modified:"$'\n'
  while IFS= read -r f; do msg+="    $f"$'\n'; done <<< "$unstaged"
fi
if [[ -n "$untracked" ]]; then
  msg+="  untracked:"$'\n'
  while IFS= read -r f; do msg+="    $f"$'\n'; done <<< "$untracked"
fi

# Stop hook JSON output — Claude Code requires Node.js so it is always available.
printf '%s' "$msg" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({reason:d.trimEnd()})+'\n'))" || true
