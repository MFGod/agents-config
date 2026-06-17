#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR=$(cd "$(dirname "$SCRIPT_NAME")" && pwd)
KIT_VERSION=$(cat "$SCRIPT_DIR/.claude/kit-version" 2>/dev/null || echo "unknown")
INSTALLED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# --- flags ---
TARGET=""
FORCE=false
YES=false
STACKS=""
STACKS_GIVEN=false
CAVEMAN_FLAG=false
# honor NO_COLOR env convention (https://no-color.org)
if [[ -n "${NO_COLOR:-}" ]]; then _NO_COLOR=true; else _NO_COLOR=false; fi

# Prints usage and exits.
usage() {
  printf "Использование: %s [TARGET] [--force] [--yes] [--no-color] [--stacks СПИСОК]\n" "$SCRIPT_NAME"
  printf "  TARGET            путь к целевому проекту (по умолчанию: \$PWD)\n"
  printf "  --force, -f       перезаписать существующие файлы кита\n"
  printf "  --yes, -y         авто-подтверждение всех y/N запросов\n"
  printf "  --no-color        отключить цветной вывод\n"
  printf "  --stacks, -s LIST стек-правила через запятую: react,vue,fastapi,django,all,none\n"
  printf "  --caveman         установить Cursor caveman mode (cursor-caveman.mdc, alwaysApply)\n"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --force|-f)   FORCE=true ;;
    --yes|-y)     YES=true ;;
    --no-color)   _NO_COLOR=true ;;
    --target|-t)  if [[ $# -lt 2 ]]; then printf "Ошибка: --target требует путь\n" >&2; usage >&2; exit 1; fi
                  TARGET="$2"; shift ;;
    --stacks|-s)  if [[ $# -lt 2 ]]; then printf "Ошибка: --stacks требует значение\n" >&2; usage >&2; exit 1; fi
                  STACKS_GIVEN=true
                  STACKS="${STACKS:+$STACKS,}$2"
                  shift ;;
    --caveman)    CAVEMAN_FLAG=true ;;
    --help|-h)    usage; exit 0 ;;
    -*)           printf "Неизвестный флаг: %s\n" "$1" >&2; usage >&2; exit 1 ;;
    *)            if [[ -z "$TARGET" ]]; then TARGET="$1"
                  else printf "Неожиданный аргумент: %s\n" "$1" >&2; usage >&2; exit 1; fi ;;
  esac
  shift
done

TARGET="${TARGET:-$PWD}"

# --- colors ---
if [[ "$_NO_COLOR" == false ]] && [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; RESET=''
fi

# --- error handling ---
_DIE=false
trap 'rc=$?; [[ "$_DIE" == false ]] && (( rc != 0 )) && printf "\n%bПрервано.%b Установка неполная.\n" "$RED" "$RESET" >&2' EXIT

# Prints error to stderr and exits non-zero.
die() { _DIE=true; printf "%bОшибка:%b %s\n" "$RED" "$RESET" "$1" >&2; exit 1; }

# --- low-level helpers ---

# Prompts y/N; auto-yes with --yes flag; returns 1 if stdin is not a terminal.
ask() {
  [[ "$YES" == true ]] && return 0
  [[ -t 0 ]] || return 1
  local answer
  printf "%b" "$1"
  read -r answer
  [[ "$answer" =~ ^[yY]$ ]]
}

# Russian plural for file count: 1→файл, 2-4→файла, 5+→файлов.
_plural_files() {
  local m=$(( $1 % 100 )) r=$(( $1 % 10 ))
  if   (( m >= 11 && m <= 19 )); then printf 'файлов'
  elif (( r == 1 ));              then printf 'файл'
  elif (( r >= 2 && r <= 4 ));   then printf 'файла'
  else                                 printf 'файлов'
  fi
}

# Reads a string value for key from a JSON file.
# Uses node (robust, handles multi-line/special chars); falls back to sed for simple fields.
# Returns empty string if file missing or key not found.
_read_json_str() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || { echo ""; return; }
  if command -v node &>/dev/null; then
    RJSON_FILE="$file" RJSON_KEY="$key" \
      node -e "try{var d=JSON.parse(require('fs').readFileSync(process.env.RJSON_FILE,'utf8'));var v=d[process.env.RJSON_KEY];if(v!=null)process.stdout.write(String(v))}catch(e){}" 2>/dev/null
  else
    sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" "$file" | head -1
  fi
}

# Appends entry to TARGET .gitignore if not already present.
ensure_gitignore_entry() {
  local entry="$1" gitignore="$TARGET/.gitignore"
  [[ -f "$gitignore" ]] && grep -qxF "$entry" "$gitignore" && return 0
  # Ensure file ends with newline before appending to avoid line-concatenation.
  if [[ -s "$gitignore" ]]; then
    local last
    last=$(tail -c1 "$gitignore"; printf x)
    [[ "${last%x}" == $'\n' ]] || printf "\n" >> "$gitignore"
  fi
  printf "%s\n" "$entry" >> "$gitignore"
  printf "  %bдобавлен%b в .gitignore: %s\n" "$GREEN" "$RESET" "$entry"
}

# Creates github_token placeholder in secrets_dir if missing; updates .gitignore.
setup_github_token() {
  local secrets_dir="$1"
  local token_path="$secrets_dir/github_token"
  if [[ ! -f "$token_path" ]]; then
    mkdir -p "$secrets_dir"
    printf "# GitHub Personal Access Token (scope: repo / contents:read)\n# Получить: GitHub → Settings → Developer settings → Personal access tokens\nghp_REPLACE_ME\n" > "$token_path"
    printf "  %bсоздан%b: %s\n" "$GREEN" "$RESET" "$token_path"
    printf "  %b!%b Вставь свой PAT для авто-проверки версий kit.\n" "$YELLOW" "$RESET"
  fi
  local rel="${secrets_dir#"$TARGET/"}/github_token"
  ensure_gitignore_entry "$rel"
}

# Copies src to dst; skips if dst exists and !FORCE; skips silently if src missing.
copy_file_safe() {
  local src="$1" dst="$2"
  if [[ ! -f "$src" ]]; then
    printf "  %bпропущен%b (нет источника): %s\n" "$YELLOW" "$RESET" "$src" >&2
    return
  fi
  if [[ -e "$dst" ]] && [[ "$FORCE" == false ]]; then
    printf "  %bпропущен%b (существует): %s\n" "$YELLOW" "$RESET" "$dst"
    return
  fi
  mkdir -p "$(dirname "$dst")"
  cp -- "$src" "$dst"
  printf "  %bскопирован%b: %s\n" "$GREEN" "$RESET" "$dst"
}

# Recursively copies src/ → dst/; skips existing files unless FORCE.
# Optional 3rd arg: relative path to exclude (e.g. plugin manifest not needed in installs).
# Prints a summary line only when files were actually copied.
copy_dir() {
  local src="$1" dst="$2" exclude="${3:-}" f rel df copied=0 skipped=0
  if [[ ! -d "$src" ]]; then
    printf "  %bпропущен%b (нет источника): %s\n" "$YELLOW" "$RESET" "$src" >&2
    return
  fi
  local _find_out
  _find_out=$(mktemp) || return
  find "$src" -type f -print0 2>/dev/null > "$_find_out" || \
    printf "  %b!%b find failed в %s — установка может быть неполной\n" "$YELLOW" "$RESET" "$src" >&2
  while IFS= read -r -d '' f; do
    rel="${f#"$src"/}"
    [[ -n "$exclude" && "$rel" == "$exclude" ]] && continue
    df="$dst/$rel"
    if [[ -e "$df" ]] && [[ "$FORCE" == false ]]; then
      skipped=$((skipped + 1))
    else
      mkdir -p "$(dirname "$df")"
      cp -- "$f" "$df"
      copied=$((copied + 1))
    fi
  done < "$_find_out"
  rm -f "$_find_out"
  if [[ $copied -gt 0 ]]; then
    printf "  %bскопировано%b: %d %s\n" "$GREEN" "$RESET" "$copied" "$(_plural_files "$copied")"
  fi
}

# Copies selected stack rule files from src_dir/ to dst_dir/ with given extension.
copy_stack_rules() {
  local src="$1" dst="$2" ext="$3"
  [[ "$INSTALL_REACT"   == true ]] && copy_file_safe "$src/react-standards.$ext"         "$dst/react-standards.$ext"
  [[ "$INSTALL_VUE"     == true ]] && copy_file_safe "$src/frontend-standards.$ext"       "$dst/frontend-standards.$ext"
  [[ "$INSTALL_FASTAPI" == true ]] && copy_file_safe "$src/python-fastapi-standards.$ext" "$dst/python-fastapi-standards.$ext"
  [[ "$INSTALL_DJANGO"  == true ]] && copy_file_safe "$src/python-django-standards.$ext"  "$dst/python-django-standards.$ext"
  return 0
}

# --- kit metadata ---

# Writes kit-meta.json atomically, preserving latestVersion/lastCheckedAt/notifiedAt from existing file.
write_kit_meta() {
  local meta_path="$1"
  local latest_ver last_checked notified_at
  latest_ver=$(_read_json_str latestVersion  "$meta_path")
  last_checked=$(_read_json_str lastCheckedAt "$meta_path")
  notified_at=$(_read_json_str notifiedAt     "$meta_path")

  mkdir -p "$(dirname "$meta_path")"
  local json
  json=$(printf '{ "installedAt": "%s", "kitVersion": "%s"' "$INSTALLED_AT" "$KIT_VERSION")
  [[ -n "$latest_ver" ]]   && json+=$(printf ', "latestVersion": "%s"'  "$latest_ver")
  [[ -n "$last_checked" ]] && json+=$(printf ', "lastCheckedAt": "%s"'  "$last_checked")
  [[ -n "$notified_at" ]]  && json+=$(printf ', "notifiedAt": "%s"'     "$notified_at")
  local tmp
  tmp=$(mktemp "$(dirname "$meta_path")/.kit-meta.XXXXXX")
  printf '%s }\n' "$json" > "$tmp"
  mv "$tmp" "$meta_path"
  printf "  %bобновлён%b: %s\n" "$GREEN" "$RESET" "$meta_path"
}

# Returns the installed kitVersion from meta file, or empty string if not found.
read_meta_version() {
  _read_json_str kitVersion "$1"
}

# --- version management ---

# Compares two semver strings; echoes: gt / lt / eq / unknown.
semver_compare() {
  local v1="$1" v2="$2"
  if [[ -z "$v1" || "$v1" == "unknown" || -z "$v2" || "$v2" == "unknown" ]]; then
    echo unknown; return
  fi
  local IFS='.' i
  local -a a=($v1) b=($v2)
  for i in 0 1 2; do
    local x=${a[$i]:-0} y=${b[$i]:-0}
    x=${x%%[^0-9]*}; y=${y%%[^0-9]*}
    [[ -z "$x" ]] && x=0; [[ -z "$y" ]] && y=0
    (( 10#$x > 10#$y )) && { echo gt; return; }
    (( 10#$x < 10#$y )) && { echo lt; return; }
  done
  echo eq
}

# Prints version status for label; returns 1 if install should be skipped (up-to-date or blocked downgrade).
version_check() {
  local meta_path="$1" label="$2"
  local installed_ver
  installed_ver=$(read_meta_version "$meta_path")

  if [[ -z "$installed_ver" ]]; then
    printf "  %s: первая установка v%s\n" "$label" "$KIT_VERSION"
    return 0
  fi

  local cmp
  cmp=$(semver_compare "$KIT_VERSION" "$installed_ver")

  case "$cmp" in
    unknown)
      printf "  %s: версия неизвестна (%s установлена), продолжаем\n" "$label" "$installed_ver"
      return 0
      ;;
    eq)
      if [[ "$FORCE" == false ]]; then
        printf "  %s: v%s уже установлена (используй --force для переустановки)\n" "$label" "$installed_ver"
        return 1
      fi
      printf "  %s: переустановка v%s (--force)\n" "$label" "$installed_ver"
      return 0
      ;;
    gt)
      printf "  %s: обновление %b%s%b → %b%s%b\n" \
        "$label" "$BOLD" "$installed_ver" "$RESET" "$BOLD" "$KIT_VERSION" "$RESET"
      return 0
      ;;
    lt)
      if [[ "$FORCE" == false ]]; then
        printf "  %b⚠%b  %s: даунгрейд %b%s%b → %b%s%b — используй --force.\n" \
          "$YELLOW" "$RESET" "$label" "$BOLD" "$installed_ver" "$RESET" "$BOLD" "$KIT_VERSION" "$RESET"
        return 1
      fi
      printf "  %b⚠%b  %s: даунгрейд %b%s%b → %b%s%b (--force)\n" \
        "$YELLOW" "$RESET" "$label" "$BOLD" "$installed_ver" "$RESET" "$BOLD" "$KIT_VERSION" "$RESET"
      return 0
      ;;
  esac
}

_KIT_REMOTE_URL="${_KIT_REMOTE_URL:-https://api.github.com/repos/MFGod/agents-config/contents/.claude/kit-version?ref=main}"

# Fetches remote kit-version; prints upgrade banner if a newer version is available.
check_remote_version() {
  command -v curl &>/dev/null || return 0
  local remote_ver token=""
  token=$(grep -v '^#' "$SCRIPT_DIR/.claude/secrets/github_token" 2>/dev/null | tr -d '[:space:]') || true
  [[ "$token" == *REPLACE_ME* ]] && token=""
  if [[ -n "$token" ]]; then
    remote_ver=$(curl -sf --max-time 3 -H "Authorization: Bearer $token" -H "Accept: application/vnd.github.raw" -H "User-Agent: agents-config-kit" "$_KIT_REMOTE_URL" 2>/dev/null | tr -d '[:space:]') || true
  else
    remote_ver=$(curl -sf --max-time 3 -H "Accept: application/vnd.github.raw" -H "User-Agent: agents-config-kit" "$_KIT_REMOTE_URL" 2>/dev/null | tr -d '[:space:]') || true
  fi
  # Validate: reject empty or non-version responses (e.g. HTML redirect pages)
  [[ "$remote_ver" =~ ^[0-9]+\.[0-9]+ ]] || return 0
  local cmp
  cmp=$(semver_compare "$remote_ver" "$KIT_VERSION")
  [[ "$cmp" == "gt" ]] || return 0
  local sep="──────────────────────────────────────────────────────"
  printf "%b%s%b\n" "$YELLOW" "$sep" "$RESET"
  printf "%b  ⚡ Доступна новая версия: %s%b  (у вас %s)\n" "$YELLOW" "$remote_ver" "$RESET" "$KIT_VERSION"
  printf "%b     Обновить: git -C <путь-к-ai-dev> pull && bash install.sh <target>%b\n" "$BOLD" "$RESET"
  printf "%b%s%b\n\n" "$YELLOW" "$sep" "$RESET"
}

# --- stack selection ---

# Sets INSTALL_* flags from --stacks argument or interactive prompt.
select_stacks() {
  INSTALL_REACT=false; INSTALL_VUE=false
  INSTALL_FASTAPI=false; INSTALL_DJANGO=false

  if [[ "$STACKS_GIVEN" == true ]]; then
    local s IFS=','
    for s in $STACKS; do
      s="${s// /}"
      case "$s" in
        react)   INSTALL_REACT=true ;;
        vue)     INSTALL_VUE=true ;;
        fastapi) INSTALL_FASTAPI=true ;;
        django)  INSTALL_DJANGO=true ;;
        all)     INSTALL_REACT=true; INSTALL_VUE=true; INSTALL_FASTAPI=true
                 INSTALL_DJANGO=true ;;
        none|"") ;;
        *)       printf "  %bнеизвестный стек:%b %s — пропущен\n" "$YELLOW" "$RESET" "$s" ;;
      esac
    done
    return
  fi

  local selection=""
  if [[ -t 0 ]]; then
    printf "\n%bВыбери стек-правила%b (Enter — пропустить):\n" "$BOLD" "$RESET"
    printf "  [1] React    (*.tsx, *.jsx, src/store/, pages/)\n"
    printf "  [2] Vue      (*.vue, composables/)\n"
    printf "  [3] FastAPI  (src/main.py, core/, *client*, *router*)\n"
    printf "  [4] Django   (config/, src/api/, src/engine/, src/workers/)\n"
    printf "\n"
    printf "Введи номера через пробел: "
    read -r selection || true
  fi
  local -a nums
  read -ra nums <<< "$selection" || true
  for n in "${nums[@]+"${nums[@]}"}"; do
    case $n in
      1) INSTALL_REACT=true ;;
      2) INSTALL_VUE=true ;;
      3) INSTALL_FASTAPI=true ;;
      4) INSTALL_DJANGO=true ;;
      *) printf "  %bнеизвестный выбор:%b %s — пропущен\n" "$YELLOW" "$RESET" "$n" ;;
    esac
  done
}

# --- installers ---

# Installs .claude/ tree: hooks, agents, skills, rules, settings, CLAUDE.md, .mcp.json.
install_claude_core() {
  version_check "$TARGET/.claude/kit-meta.json" "Claude Code" || return 0
  printf "\n%bClaude Code%b\n" "$BOLD" "$RESET"

  copy_dir "$SCRIPT_DIR/.claude/hooks"  "$TARGET/.claude/hooks" "hooks.json"
  copy_dir "$SCRIPT_DIR/.claude/agents" "$TARGET/.claude/agents"

  for skill in caveman caveman-commit caveman-review caveman-compress caveman-help caveman-stats gstack cavecrew headroom rtk session-teacher debug migrate deploy; do
    copy_dir "$SCRIPT_DIR/.claude/skills/$skill" "$TARGET/.claude/skills/$skill"
  done

  for rule in global-standards dev-workflow structured-response gstack-workflow git-conventions testing-standards; do
    copy_file_safe "$SCRIPT_DIR/.claude/rules/$rule.md" "$TARGET/.claude/rules/$rule.md"
  done

  copy_stack_rules "$SCRIPT_DIR/.claude/rules" "$TARGET/.claude/rules" md

  copy_file_safe "$SCRIPT_DIR/.claude/kit-version" "$TARGET/.claude/kit-version"
  [[ -f "$SCRIPT_DIR/.claude/README.md" ]] && \
    copy_file_safe "$SCRIPT_DIR/.claude/README.md" "$TARGET/.claude/README.md"

  # settings.json: merge-only при обновлении — пользовательские настройки не трогаем.
  if [[ -f "$SCRIPT_DIR/.claude/settings-template.json" ]]; then
    mkdir -p "$TARGET/.claude"
    if [[ ! -f "$TARGET/.claude/settings.json" ]]; then
      cp -- "$SCRIPT_DIR/.claude/settings-template.json" "$TARGET/.claude/settings.json"
      printf "  %bсоздан%b: %s (из шаблона)\n" "$GREEN" "$RESET" "$TARGET/.claude/settings.json"
    elif command -v node &>/dev/null; then
      if result=$(node "$SCRIPT_DIR/.claude/scripts/merge-settings.js" \
          "$TARGET/.claude/settings.json" \
          "$SCRIPT_DIR/.claude/settings-template.json" 2>&1); then
        printf "  settings.json: %s\n" "$result"
      else
        printf "  %b!%b settings.json: merge failed — %s\n" "$YELLOW" "$RESET" "$result"
      fi
    else
      printf "  %b!%b settings.json: node not found — hooks not merged from template\n" "$YELLOW" "$RESET"
    fi
  fi

  copy_file_safe "$SCRIPT_DIR/.mcp.json" "$TARGET/.mcp.json"

  # CLAUDE.md: только первая установка, не перезаписываем пользовательскую версию
  if [[ -f "$SCRIPT_DIR/CLAUDE.md" ]] && [[ ! -f "$TARGET/CLAUDE.md" ]]; then
    cp -- "$SCRIPT_DIR/CLAUDE.md" "$TARGET/CLAUDE.md"
    printf "  %bсоздан%b: %s\n" "$GREEN" "$RESET" "$TARGET/CLAUDE.md"
    printf "  %b!%b Адаптируй CLAUDE.md под свой проект.\n" "$YELLOW" "$RESET"
  fi

  setup_github_token "$TARGET/.claude/secrets"
  write_kit_meta "$TARGET/.claude/kit-meta.json"
}

# Installs .cursor/ tree: rules (core + stack).
install_cursor_core() {
  version_check "$TARGET/.cursor/kit-meta.json" "Cursor" || return 0
  printf "\n%bCursor%b\n" "$BOLD" "$RESET"

  for rule in global-standards dev-workflow structured-response gstack-workflow \
              git-conventions testing-standards session-teacher debug migrate deploy \
              cursor-kit-maintenance project-profile-bootstrap; do
    copy_file_safe "$SCRIPT_DIR/.cursor/rules/$rule.mdc" "$TARGET/.cursor/rules/$rule.mdc"
  done
  [[ "$INSTALL_CAVEMAN" == true ]] && \
    copy_file_safe "$SCRIPT_DIR/.cursor/rules/cursor-caveman.mdc" "$TARGET/.cursor/rules/cursor-caveman.mdc"

  copy_stack_rules "$SCRIPT_DIR/.cursor/rules" "$TARGET/.cursor/rules" mdc

  copy_file_safe "$SCRIPT_DIR/.cursor/kit-version" "$TARGET/.cursor/kit-version"
  [[ -f "$SCRIPT_DIR/.cursor/AGENTS.md" ]] && \
    copy_file_safe "$SCRIPT_DIR/.cursor/AGENTS.md" "$TARGET/.cursor/AGENTS.md"
  [[ -f "$SCRIPT_DIR/.cursor/mcp.json" ]] && \
    copy_file_safe "$SCRIPT_DIR/.cursor/mcp.json" "$TARGET/.cursor/mcp.json"
  [[ -f "$SCRIPT_DIR/.cursor/hooks.json" ]] && \
    copy_file_safe "$SCRIPT_DIR/.cursor/hooks.json" "$TARGET/.cursor/hooks.json"
  [[ -d "$SCRIPT_DIR/.cursor/hooks" ]] && \
    copy_dir "$SCRIPT_DIR/.cursor/hooks" "$TARGET/.cursor/hooks"
  # safety-guard.js and caveman-config.js are symlinks in the kit repo
  # (→ .claude/hooks/) so copy_dir skips them (find -type f ignores symlinks).
  # These explicit copies install the real files into target projects.
  copy_file_safe "$SCRIPT_DIR/.claude/hooks/safety-guard.js" \
                 "$TARGET/.cursor/hooks/safety-guard.js"
  copy_file_safe "$SCRIPT_DIR/.claude/hooks/caveman-config.js" \
                 "$TARGET/.cursor/hooks/caveman-config.js"

  setup_github_token "$TARGET/.cursor/secrets"
  write_kit_meta "$TARGET/.cursor/kit-meta.json"
}

# --- guards ---
[[ -d "$TARGET" ]] || die "директория '$TARGET' не существует."
[[ "$(realpath "$TARGET")" == "$(realpath "$SCRIPT_DIR")" ]] && \
  die "целевой проект совпадает с репозиторием кита."
[[ -d "$SCRIPT_DIR/.claude" ]] || [[ -d "$SCRIPT_DIR/.cursor" ]] || \
  die "в '$SCRIPT_DIR' не найдены .claude/ или .cursor/."
[[ -w "$TARGET" ]] || die "нет прав записи в '$TARGET'."

# --- main ---
printf "\n%bAgents-config v%s%b\n" "$BOLD" "$KIT_VERSION" "$RESET"
printf "Целевой проект: %b%s%b\n" "$BOLD" "$TARGET" "$RESET"
[[ "$FORCE" == true ]] && printf "%b! режим --force: существующие файлы кита будут перезаписаны%b\n" "$YELLOW" "$RESET"
printf "\n"
check_remote_version

# Preflight: warn about missing optional dependencies. Non-fatal — installation
# proceeds, but hooks that rely on missing tools will silently degrade.
check_deps() {
  local warn=false
  if ! command -v node &>/dev/null; then
    printf "  %b!%b node не найден — hooks/settings.json merge не запустится\n" "$YELLOW" "$RESET" >&2
    warn=true
  fi
  if ! command -v rtk &>/dev/null; then
    printf "  %b!%b rtk не найден — RTK token compression недоступен (опционально)\n" "$YELLOW" "$RESET" >&2
    warn=true
  fi
  if ! command -v uv &>/dev/null; then
    printf "  %b!%b uv не найден — Headroom MCP может не работать\n" "$YELLOW" "$RESET" >&2
    warn=true
  fi
  if [[ "$warn" == true ]]; then printf "\n" >&2; fi
}
check_deps

DO_CLAUDE=false
DO_CURSOR=false
INSTALL_CAVEMAN=false

if [[ -d "$SCRIPT_DIR/.claude" ]] && ask "Установить Claude Code (.claude/ + .mcp.json)? [y/N]: "; then
  DO_CLAUDE=true
fi
if [[ -d "$SCRIPT_DIR/.cursor" ]] && ask "Установить Cursor (.cursor/)? [y/N]: "; then
  DO_CURSOR=true
fi

if [[ "$DO_CLAUDE" == true ]] || [[ "$DO_CURSOR" == true ]]; then
  select_stacks
  printf "\n"
  if [[ "$CAVEMAN_FLAG" == true ]]; then
    INSTALL_CAVEMAN=true
  elif [[ -t 0 ]] && [[ "$YES" == false ]]; then
    ask "Установить Cursor caveman mode (сжатие ответов, alwaysApply)? [y/N]: " && INSTALL_CAVEMAN=true || true
  fi
fi

[[ "$DO_CLAUDE" == true ]] && install_claude_core
[[ "$DO_CURSOR" == true ]] && install_cursor_core

printf "\n"
if [[ "$DO_CLAUDE" == true ]] || [[ "$DO_CURSOR" == true ]]; then
  printf "%bГотово.%b Agents-config v%s → %s\n" "$GREEN" "$RESET" "$KIT_VERSION" "$TARGET"
  [[ "$DO_CLAUDE" == true ]] && \
    printf "  Хуки: требуется %bnode%b в PATH (.claude/hooks/)\n" "$YELLOW" "$RESET"
  [[ "$DO_CURSOR" == true ]] && \
    printf "  Cursor хуки: требуется %bnode%b в PATH (.cursor/hooks/)\n" "$YELLOW" "$RESET"
  [[ "$DO_CURSOR" == true ]] && \
    printf "  %b!%b .cursor/rules/*.mdc — вручную при релизе (source of truth: .claude/rules/). См. .cursor/rules/cursor-kit-maintenance.mdc\n" "$YELLOW" "$RESET"
  printf "\n  %bMCP серверы подключены автоматически:%b\n" "$BOLD" "$RESET"
  if [[ "$DO_CLAUDE" == true ]]; then
    printf "  Claude Code (.mcp.json):\n"
    printf "    headroom          — сжатие tool outputs, экономит токены контекста\n"
    printf "    context7          — актуальная документация библиотек прямо в промпт\n"
    printf "    playwright        — управление браузером (UI-тесты, web-автоматизация)\n"
    printf "    chrome-devtools   — инспекция DOM, сети, консоли Chrome\n"
  fi
  if [[ "$DO_CURSOR" == true ]]; then
    printf "  Cursor (.cursor/mcp.json):\n"
    printf "    headroom    — сжатие tool outputs, экономит токены контекста\n"
    printf "    filesystem  — чтение/запись файлов проекта (whitelist: текущая папка)\n"
    printf "    fetch       — HTTP запросы к URL, чтение веб-страниц\n"
    printf "    context7    — актуальная документация библиотек прямо в промпт\n"
  fi
  printf "\n  %b🔑 Авто-проверка версий kit:%b\n" "$BOLD" "$RESET"
  printf "  Вставь GitHub Personal Access Token (scope: %brepo / contents:read%b)\n" "$BOLD" "$RESET"
  printf "  Получить: GitHub → Settings → Developer settings → Personal access tokens\n"
  [[ "$DO_CLAUDE" == true ]] && \
    printf "    Claude Code: %b%s/.claude/secrets/github_token%b\n" "$YELLOW" "$TARGET" "$RESET"
  [[ "$DO_CURSOR" == true ]] && \
    printf "    Cursor:      %b%s/.cursor/secrets/github_token%b\n" "$YELLOW" "$TARGET" "$RESET"
  printf "  Файл%s уже создан%s с placeholder — замени %bghp_REPLACE_ME%b на свой токен.\n" \
    "$( [[ "$DO_CLAUDE" == true ]] && [[ "$DO_CURSOR" == true ]] && echo "ы" || echo "" )" \
    "$( [[ "$DO_CLAUDE" == true ]] && [[ "$DO_CURSOR" == true ]] && echo "ы" || echo "" )" \
    "$BOLD" "$RESET"
else
  printf "%bНичего не установлено.%b\n" "$YELLOW" "$RESET"
fi
printf "\n"
