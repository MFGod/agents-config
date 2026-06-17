# .claude — Claude Code Kit

Детальная документация по конфигурации Claude Code.
Общий обзор и быстрый старт — в [`README.md`](../README.md).

---

## Структура папки

```
.claude/
├── settings.json          # Активные настройки Claude Code
├── settings-template.json # Шаблон для установки на новой машине
├── kit-version            # Текущая версия кита (симлинк ← .cursor/kit-version)
├── kit-meta.json          # Дата установки и версия (авто)
├── hooks/                 # Runtime-хуки жизненного цикла
│   ├── session-activate.js      # SessionStart: активация caveman + headroom + rtk (unified)
│   ├── mode-tracker.js          # UserPromptSubmit: трекинг caveman + rtk + headroom + /caveman-stats (unified)
│   ├── rtk-rewrite.sh           # PreToolUse: перехват Bash-команд → rtk hook claude
│   ├── post-edit-check.js       # PostToolUse: синтаксическая проверка после Edit/Write
│   ├── caveman-config.js        # Shared util: резолв режима, флаг-файл (source of truth; .cursor/hooks/ → симлинк)
│   ├── caveman-stats.js         # Статистика токенов сессии
│   ├── caveman-statusline.sh    # Badge в терминале (macOS/Linux)
│   ├── caveman-statusline.ps1   # Badge в терминале (Windows)
│   ├── stop-check.sh            # Stop: показывает несохранённые файлы
│   ├── safety-guard.js          # PreToolUse: блокирует DROP TABLE + force push (source of truth; .cursor/hooks/ → симлинк)
│   └── package.json             # {"type":"commonjs"} — требуется для require() в хуках
├── scripts/               # Install-time утилиты (не runtime-хуки)
│   └── merge-settings.js        # Idempotent merge хуков при обновлении кита
├── rules/                 # Правила для модели (auto-attach по путям)
├── skills/                # Slash-команды (/caveman, /gstack и др.)
└── agents/                # Субагенты (cavecrew-*)
```

---

## settings.json

| Параметр | Значение | Описание |
|----------|----------|----------|
| `effortLevel` | `high` | Модель думает глубже (больше вычислений на ответ) |
| `theme` | `dark-ansi` | Тёмная тема с ANSI-цветами в терминале |
| `enableAllProjectMcpServers` | `true` | Все MCP-серверы из `.mcp.json` включаются автоматически |
| `hooks.SessionStart` | `session-activate.js` | Активирует caveman + headroom + RTK при старте сессии |
| `hooks.UserPromptSubmit` | `mode-tracker.js` | Трекает все режимы (caveman/rtk/headroom) + /caveman-stats на каждый промпт |
| `hooks.PreToolUse` | `safety-guard.js` | Блокирует `DROP TABLE/DATABASE` и `git push --force` на protected branches |
| `hooks.PreToolUse` | `rtk-rewrite.sh` | Перехватывает Bash-команды, переписывает через `rtk hook claude` (timeout 10s) |
| `statusLine` | `caveman-statusline.sh` | Показывает `[CAVEMAN]` badge в строке состояния терминала |

SessionStart и UserPromptSubmit хуки — timeout **5 секунд**. PreToolUse (rtk-rewrite.sh) — **10 секунд**.

---

## Hooks

### `session-activate.js` — SessionStart

Единый хук: активирует caveman, headroom, RTK за один Node-процесс.

1. **Caveman** — резолвит режим (`CAVEMAN_DEFAULT_MODE` env → `~/.config/caveman/config.json` → `'full'`), пишет флаг `~/.claude/.caveman-active`, инжектирует правила в контекст
2. **Headroom** — читает/создаёт `~/.claude/.headroom-active` (default ON), эмитит правило компрессии + ToolSearch-инструкцию
3. **RTK** — читает/создаёт `~/.claude/.rtk-active` (default ON), эмитит статус `RTK ACTIVE (ON)`

Если `statusLine` не настроен — добавляет подсказку в первый промпт.

### `mode-tracker.js` — UserPromptSubmit

Единый трекер: обрабатывает все команды toggle и инжектирует per-turn напоминания.

1. Детектирует `/caveman [lite|full|ultra|off]` и NL-команды (`stop caveman`, `normal mode`, `activate caveman`)
2. Детектирует `/rtk [on|off]` и NL (рус/англ)
3. Детектирует `/headroom [on|off]` и NL (рус/англ)
4. `/caveman-stats` → блокирует промпт (`decision: block`), возвращает статистику токенов
5. Обновляет соответствующие флаг-файлы, инжектирует объединённый `additionalContext`

### `rtk-rewrite.sh` — PreToolUse

1. Отказывает при symlink-флаге (защита)
2. Читает `~/.claude/.rtk-active` (первые 8 байт)
3. `on` → `exec rtk hook claude` (переписывает stdin с командой)
4. Всё остальное → `exit 0` (команда проходит без изменений)

Требует бинарь `rtk` в `$PATH`.

### `caveman-config.js` — общий модуль

| Функция | Что делает |
|---------|-----------|
| `getDefaultMode()` | Резолвит режим с приоритетами (env → config → `'full'`) |
| `safeWriteFlag()` | Атомарная запись: temp-файл + rename, `O_NOFOLLOW`, права `0600` |
| `readFlag()` | Чтение режима с whitelist-валидацией, отказ при symlink, cap 64 байта |
| `readBoolFlag()` | Чтение on/off-флага (rtk, headroom), отказ при symlink, cap 8 байт |
| `appendFlag()` | Append в history-лог `.caveman-history.jsonl` (для статистики) |
| `readHistory()` | Чтение history-лога для агрегации статистики |

---

## Официальные инструменты

Кит интегрирует три open-source инструмента для двусторонней оптимизации токенов:

| Инструмент | Репозиторий | Что делает | Как интегрирован |
|-----------|-------------|-----------|-----------------|
| **RTK** | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Сжимает Bash-output (git, ls, тесты) | `rtk hook claude` в PreToolUse через `rtk-rewrite.sh` |

> **RTK и `rtk init -g`:** не запускай `rtk init -g` поверх этой конфигурации. Официальный установщик удалит `rtk-rewrite.sh` и перепишет `settings.json`, конфликтуя с toggle-механизмом (`/rtk on`/`off`). Если нужна чистая RTK-инсталляция — сначала удали интеграцию из `settings.json` вручную.
| **Caveman** | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | Сжимает output модели ~75% | SessionStart (`session-activate.js`) + UserPromptSubmit (`mode-tracker.js`) |
| **Headroom** | [chopratejas/headroom](https://github.com/chopratejas/headroom) | Сжимает tool outputs (MCP) | `.mcp.json` → `headroom_compress` / `headroom_retrieve` |

Наши отклонения от официальных инструментов минимальны и обоснованы:

- **RTK** — официальный инструмент не имеет per-session toggle. Добавлен флаг-файл `~/.claude/.rtk-active` для `/rtk off`/`on` без перезапуска.
- **Caveman** — hardcoded rules в `session-activate.js` вместо чтения SKILL.md: это соответствует официальному паттерну (SKILL.md — документация для пользователя, не для модели). Headroom и RTK tracking объединены в `mode-tracker.js` — это расширение, которого нет в официальном инструменте.
- **Headroom** — MCP-сервер используется без изменений. Toggle-механизм (`/headroom on/off`) интегрирован в `session-activate.js` и `mode-tracker.js`.

---

## Флаг-файлы — единая точка правды

| Флаг | Значения | Кто пишет | Кто читает |
|------|----------|-----------|-----------|
| `~/.claude/.caveman-active` | `lite/full/ultra/off` | `session-activate.js`, `mode-tracker.js` | `mode-tracker.js`, `statusline.sh` |
| `~/.claude/.headroom-active` | `on/off` | `session-activate.js`, `mode-tracker.js` | `mode-tracker.js` |
| `~/.claude/.rtk-active` | `on/off` | `session-activate.js`, `mode-tracker.js` | `rtk-rewrite.sh`, `mode-tracker.js` |

Защита всех флаг-файлов:
- Атомарная запись через `temp + rename`
- `O_NOFOLLOW` — отказ записи/чтения если файл — symlink
- uid-проверка если родительская папка — symlink
- Ограничение размера чтения (64 байта для режима, 8 для on/off) — обрезает попытки exfil через oversized значение
- VALID_MODES whitelist — неизвестные значения возвращают `null`

---

## Режимы Caveman

| Режим | Описание |
|-------|----------|
| `lite` | Без filler/hedging, полные предложения, профессионально но кратко |
| `full` | По умолчанию. Без артиклей, фрагменты OK, короткие синонимы |
| `ultra` | Аббревиатуры (DB/auth/req/res), стрелки для причинности (X→Y) |
| `off` | Отключить — флаг = `off`, badge скрыт (persist между сессиями) |

Переключить: `/caveman lite` / `/caveman ultra` / `/caveman off`

Приоритет резолва:
```
CAVEMAN_DEFAULT_MODE (env)  →  ~/.config/caveman/config.json  →  'full'
```

---

## Rules — автоматическая загрузка

| Файл | Когда активен |
|------|--------------|
| `global-standards.md` | **Всегда** |
| `dev-workflow.md` | **Всегда** — тесты, рефакторинг, безопасность |
| `structured-response.md` | **Всегда** — ≥3 файлов / новый API / риск регрессии |
| `gstack-workflow.md` | **Всегда** — полный цикл фичи |
| `git-conventions.md` | **Всегда** — коммиты, ветки, PR, merge |
| `react-standards.md` | `*.tsx`, `*.jsx`, `src/store/`, `pages/` |
| `vue-standards.md` | `*.vue`, `*.css`, `*.scss`, `composables/`, `views/`, `stores/` |
| `python-fastapi-standards.md` | `src/main.py`, `core/`, `*service*`, `*client*`, `*router*` |
| `python-django-standards.md` | `config/`, `src/api/`, `src/engine/`, `src/workers/` |

---

## Skills — slash-команды

| Команда | Что делает |
|---------|-----------|
| `/caveman` | Включить/переключить режим ответов |
| `/caveman-commit` | Сгенерировать commit message (Conventional Commits, subject ≤50 chars) |
| `/caveman-review` | Ultra-compressed ревью PR/диффа: 🔴bug 🟡risk 🔵nit ❓question |
| `/caveman-compress` | Сжать CLAUDE.md / memory-файлы в caveman-формат |
| `/caveman-stats` | Статистика токенов текущей сессии |
| `/caveman-help` | Справка по всем командам |
| `/gstack` | Полный цикл: Think → Plan (FROZEN GATE) → Build → Review → Test |
| `/cavecrew` | Гайд: когда делегировать субагентам |
| `/rtk` | Включить/выключить RTK rewrite Bash-команд (`/rtk on` / `/rtk off`) |

---

## Agents — субагенты

| Агент | Модель | Назначение | Ограничение |
|-------|--------|-----------|-------------|
| `cavecrew-investigator` | haiku | Read-only поиск: `file:line` для символа/паттерна | Только чтение, отказывает при запросе фикса |
| `cavecrew-builder` | наследует main | Правки 1–2 файла: Read → Edit → Verify → receipt | Отказывает при ≥3 файлах |
| `cavecrew-reviewer` | haiku | Ревью диффа: одна строка = одна находка | Только `git diff/log/show`, нет мутаций |
| `cavecrew-tester` | haiku | Пишет unit-тесты для файла/функции в стиле проекта | Только тесты, отказывает в правках prod-кода |

Вывод агентов caveman-compressed → ~60% экономия токенов в main thread.

---

## Headroom MCP

Сжимает большие tool outputs (логи, grep, листинги) до передачи в контекст модели.

| Инструмент | Что делает |
|-----------|-----------|
| `headroom_compress` | Сохраняет большой output в хранилище, возвращает ключ |
| `headroom_retrieve` | Восстанавливает по ключу. `query="keyword"` — частичное извлечение: возвращает только matching items вместо полного содержимого |
| `headroom_retrieve` (полный) | `headroom_retrieve(hash)` — весь сохранённый контент |
| `headroom_stats` | Показывает статистику сжатия текущей сессии |

Подключается через `.mcp.json` в корне проекта. Требует `uv`.

### Максимальный режим (proxy)

Запусти headroom proxy для автоматического сжатия всего трафика (~92% vs ~60% в MCP-only режиме):

```bash
headroom proxy &
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 claude
```

В этом режиме сжатие происходит прозрачно без явных вызовов `headroom_compress`.

### Как работает автоматически

```
Session Start    ──► session-activate.js ──► пишет/читает ──► ~/.claude/.headroom-active
                                          └──► инжектирует правило в контекст модели
Каждый промпт   ──► mode-tracker.js ──► читает флаг ──► напоминание per-turn
```

Первый старт: флаг отсутствует → **включается автоматически** (`"on"` по умолчанию).

Схемы MCP-инструментов загружаются через `ToolSearch` в начале каждой сессии (инструкция инжектируется хуком). Сама компрессия — по решению модели при outputs >100 строк / >3000 символов.

### Флаг-файл

`~/.claude/.headroom-active` — контент `"on"` или `"off"`.  
Защита: `readBoolFlag` с `O_NOFOLLOW`, cap 8 байт, whitelist `on`/`off`.

### Переключение

```
/headroom           → включить
/headroom off       → выключить
выключить headroom  → выключить (NL, RU)
disable headroom    → выключить (NL, EN)
```

### Когда использовать

| Сценарий | Headroom |
|----------|----------|
| Debug / расследование | осторожно — детали могут потеряться при сжатии |
| Рутина / batch / long sessions | ON — экономит контекст на grep/логах |

---

## gstack — цикл разработки фичи

```
THINK → PLAN → [FROZEN GATE: явный ОК] → BUILD → REVIEW → TEST
                                               ↑
                                    При отклонении:
                                    СТОП → мини-план → ОК → продолжай
```

Применять: новая фича ≥3 файлов, архитектурное решение, риск миграций/контрактов.
Не применять: фикс ≤2 файлов, однострочники, поиск.

---

## Обновление кита

Текущая версия — в [`kit-version`](kit-version); установленная версия и дата — в `kit-meta.json` (генерируется `install.sh`).

```bash
bash /path/to/agents-config/install.sh /path/to/your-project
```

Агент напомнит обновить, если `kitVersion` устарел (проверка каждые 14 дней).

---

## Диагностика и отладка

### Хуки не срабатывают

Хуки silent-fail при ошибках (намеренно — не прерываем работу). Для диагностики:

```bash
CAVEMAN_DEBUG=1 node .claude/hooks/caveman-config.js
```

При `CAVEMAN_DEBUG=1` функция `resolveRealDir` выводит в stderr причину отказа (например, symlink-target принадлежит другому uid).

Что ещё проверить:
- `node` доступен в `$PATH` (`node --version`)
- Хуки зарегистрированы в `settings.json` (секции `hooks.SessionStart`, `hooks.PreToolUse`)
- Флаг-файлы не повреждены: `cat ~/.claude/.caveman-active` → должно быть одно из `lite`/`full`/`ultra`/`off`

### `/caveman-compress` — передача данных в Anthropic API

`/caveman-compress` вызывает Claude для сжатия текста. **Содержимое файла передаётся в Anthropic API.** Не запускай на файлах с секретами или PII.

Скрипт автоматически блокирует:
- Файлы с именами типа `.env`, `credentials`, `id_rsa`, `*.pem` и подобные
- Файлы в директориях `.ssh`, `.aws`, `.kube`, `.gnupg`
- Контент с паттернами вида `api_key=...`, `token: ...`, `Authorization: Bearer ...`

Если блокировка ложная — переименуй файл или передай `--force-compress`.
