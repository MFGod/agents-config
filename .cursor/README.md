# Cursor — клиентские настройки

Общие инструкции находятся в корневом [`AGENTS.md`](../AGENTS.md), skills — в `.agents/skills/`. Cursor обнаруживает их нативно; отдельные копии общих skills в `.cursor/skills` не нужны. Выбор Claude или GPT в Cursor не меняет правила discovery клиента.

Поддержка Agent Skills появилась в Cursor 2.4. Ручной вызов: `/skill-name`. У уже явных skills сохраняется `disable-model-invocation: true`. Поддержку расширений Claude Code и Codex нельзя предполагать. [Документация Cursor](https://cursor.com/docs/skills).

## Rules

Клиентские адаптеры `.cursor/rules/*.mdc` соответствуют общим правилам `.agents/rules/*.md` и path-scoped `.claude/rules/*.md`. Проверка: `node .claude/scripts/check-cursor-sync.js`. Стек-правила installer выбирает через `--stacks`.

## Hooks и MCP

Конфигурация хуков: `.cursor/hooks.json`, скрипты: `.cursor/hooks/`. Требуются `node` и `python3` в PATH. Хуки доставляются только при выборе Cursor; их формат не переносится в Codex.

| Hook | Действие |
|---|---|
| `sessionStart` | Caveman/Headroom/RTK: контекст и состояние режимов |
| `preToolUse` | Safety guard и RTK rewrite для shell-команд |
| `beforeShellExecution` | Legacy safety guard |
| `preCompact` | Сохранение состояния перед сжатием контекста |

Флаги режимов находятся в `~/.claude/`, включая Cursor. Cursor уважает `/rtk off` между сессиями; Claude Code принудительно возвращает RTK в `on` при старте. Проверяйте фактическую конфигурацию клиента перед утверждением, что режим активен.

MCP находится в `.cursor/mcp.json`: Headroom, Context7, Playwright, filesystem и fetch. Для запуска нужны `uv` и `npx`. Настройки Claude Code/Codex и их model effort не управляют моделью в Cursor. Выбор моделей и миграция API: [`MODELS.md`](../MODELS.md).

Общий файл инструкций и skill не дают одинаковых прав и инструментов в разных клиентах. Проверка кита подтверждает содержимое и установку адаптеров; фактическую загрузку нужно проверить после перезапуска установленного клиента.
