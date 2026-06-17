# Инструкции для агента

Отвечай на **русском языке**. Следуй `.cursor/rules/global-standards.mdc`.

## Правила

| Файл | Когда |
|------|--------|
| `global-standards.mdc` | всегда |
| `cursor-kit-maintenance.mdc` | всегда (версия kit, напоминание обновить) |
| `project-profile-bootstrap.mdc` | всегда (создать `project-profile.mdc`, если нет) |
| `structured-response.mdc` | рефакторинг, новая фича, архитектура, большой PR |
| `dev-workflow.mdc` | тесты, рефакторинг, безопасность, зависимости |
| `gstack-workflow.mdc` | полный цикл фичи (Think → Plan → Build → Review → Test) |
| `git-conventions.mdc` | коммиты, ветки, PR, merge — **всегда при работе с git** |
| `project-profile.mdc` | контекст **этого** репозитория (создаётся агентом) |
| `react-standards.mdc` | React: `*.tsx`, `src/store`, `pages` |
| `vue-standards.mdc` | Vue 3: `*.vue`, composables |
| `python-fastapi-standards.mdc` | FastAPI |
| `python-django-standards.mdc` | Django |
| `session-teacher.mdc` | обучение, "teach me", "quiz меня", "eli5/14/ii", "проверь понимание" — пользователь добавляет через `@session-teacher` |

---

## Workflow для PR (GitHub)

1. Создай ветку от `dev`: `git checkout -b dev-<id>-<описание>`
2. Внеси атомарные изменения, коммиты по Conventional Commits
3. Push: `git push -u origin <ветка>`
4. PR в `dev` (не в `test`/`prod` напрямую)
5. Название PR: `<type>(<scope>): <что сделано>` — как коммит

**NEVER** force push в `dev`/`test`/`prod`.

---

## Cursor хуки

Конфиг: `.cursor/hooks.json`. Скрипты: `.cursor/hooks/`. Требует `node` (≥18) и `python3` (≥3.6) в PATH. Нет python3 → safety-guard fail-open (все команды разрешаются).

| Хук | Скрипт | Что делает |
|-----|--------|-----------|
| `sessionStart` | `caveman-activate.js` | Inject caveman rules в `additional_context` сессии |
| `sessionStart` | `headroom-activate.js` | Inject headroom usage rules (compress >100 lines / >3000 chars) |
| `sessionStart` | `rtk-activate.js` | Активация RTK (флаг `.rtk-active`, default on) |
| `preToolUse` (Shell) | `safety-guard.js` | Блокирует `DROP TABLE/DATABASE` и `git push --force` на protected branches (`main/master/dev/test/prod`) |
| `preToolUse` (Shell) | `rtk-rewrite.sh` | Переписывает Bash-команды через `rtk hook claude` для сжатия вывода (если RTK on) |
| `beforeShellExecution` | `safety-guard.sh` | Legacy safety-guard (обратная совместимость), shared с `safety-guard.js` |
| `preCompact` | `pre-compact.js` | Сохраняет состояние перед авто-сжатием контекста |

---

## MCP инструменты

| Сервер | Инструменты | Когда |
|--------|------------|-------|
| `headroom` | `headroom_compress`, `headroom_retrieve`, `headroom_stats` | Сжатие больших tool outputs (логи, grep, листинги >100 строк) |
| `context7` | `resolve-library-id`, `query-docs` | Актуальная документация библиотек/фреймворков |
| `playwright` | браузер: клики, формы, скриншоты | Автоматизация браузера, кросс-браузерный E2E |
| `chrome-devtools` | network, Core Web Vitals, Lighthouse | Отладка + производительность |
| `filesystem` | файлы проекта | Доступ к файлам (только Cursor) |
| `fetch` | HTTP / веб | Загрузка веб-страниц (только Cursor) |

Конфиг: `.cursor/mcp.json`. Требует `uv` (headroom, fetch) и `npx` (остальные) в PATH.
