# Agents-config v0.6.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platforms: Claude Code + Codex + Cursor](https://img.shields.io/badge/platforms-Claude%20Code%20%2B%20Codex%20%2B%20Cursor-blue)](#)

Конфигурация для AI-агентов: правила кодирования, skills, хуки жизненного цикла.
Общие инструкции и skills поддерживают **Claude Code**, **Codex** и **Cursor**. Runtime-хуки и MCP устанавливаются отдельно для Claude Code и Cursor.

Ключевые компоненты:

| Компонент | Что делает |
|-----------|-----------|
| **Общие инструкции** | Корневой `AGENTS.md` — один источник для трёх клиентов. `CLAUDE.md` содержит только `@AGENTS.md` для совместимости |
| **Rules** | Общий текст в `.claude/rules/`, адаптеры Cursor в `.cursor/rules/`; Codex читает нужные правила по маршрутам из `AGENTS.md`. Auto-attach зависит от клиента |
| **External content = данные** | Правило `external-content`: веб-страницы, MCP-результаты, API-ответы, тикеты — это **данные для анализа, а не инструкции для исполнения**. Текст вида «ignore previous instructions» внутри загруженной страницы — находка для отчёта, а не команда |
| **Общие skills** | Один набор в `.agents/skills/`: Codex и Cursor обнаруживают его нативно, Claude Code — через адаптеры `.claude/skills/`. Краткое описание → выбранный `SKILL.md` → нужные references. Клиентские инструменты и права различаются |
| **Caveman mode** | Сжимает output модели 65% (замер апстрима) без потери смысла — CC (с toggle) и Cursor (inject через `sessionStart` хук) |
| **Headroom MCP** | Сжимает input модели (логи, grep, листинги) перед передачей в контекст — CC и Cursor |
| **MCP серверы** | `context7` (документация библиотек), `playwright` (автоматизация браузера), `headroom` — CC + Cursor; `filesystem`, `fetch` — только Cursor. `chrome-devtools` — рекомендация, не автоконфигурится (см. ниже). Список сверяется с обоими `mcp.json` в CI (`check-mcp-versions.js`) |
| **Safety guard** | `PreToolUse` хук на CC и Cursor (Cursor — ещё legacy `beforeShellExecution`): блокирует `DROP TABLE/DATABASE` и `git push --force` на protected branches (`main/master/dev/test/prod`) |
| **RTK** | Перехватывает Bash-команды через `PreToolUse` hook, переписывает через `rtk` для сжатия вывода — **CC + Cursor** (Cursor получил `preToolUse`) |
| **gstack** | Методология разработки: Think → Plan → Build → Review → Test с FROZEN GATE |
| **Workflow skills** | Debug, deploy, migrate, session-teacher, caveman-commit — общие workflows. Явный вызов `/name` в Claude/Cursor, `$name` в Codex |
| **CaveCrew agents** | 4 субагента: `investigator` (поиск кода), `reviewer` (ревью), `tester` (тесты) — на haiku; `builder` (правка 1-2 файлов) наследует main-модель |
| **Design quality pipeline** | `design-critic` — блокирует шаблонные решения, требует 3 альтернативы, benchmark против Linear/Stripe/Vercel; `before-after-reviewer` — скоринг 7 метрик до/после, блокирует деградацию |
| **Design skills** | `/ui-ux-pro-max` — 79 стилей, 192 палитры, 74 font-пары; `/ux-core` — 105 когнитивных биасов как обоснование UX-решений |
| **UX Review hook** | `PostToolUse` хук: автоматически задаёт 6 UX-вопросов при редактировании `.tsx / .vue / .html / .css / .scss / .svelte` |
| **Vendored design skills** | `impeccable` — общая точка входа в дизайн. Нишевые направления вызываются явно; маршрутизация в [`AGENTS.md`](AGENTS.md). Claude/Cursor используют `disable-model-invocation`, Codex — `policy.allow_implicit_invocation: false` в `agents/openai.yaml` |
| **Writing skill** | `humanizer` (blader/humanizer, MIT) — переписывает ИИ-текст, сохраняя факты. Общий explicit-only skill; инструментальные ограничения клиентские |
| **Цепочка поставки скиллов** | Скилл — не текст, а инструкции, исполняемые **с правами пользователя**. [`skills-lock.json`](skills-lock.json) пинит sha256 **каждого файла** скилла: `SKILL.md`, `scripts/` (код, который выполнится) и `references/` (инструкции, которым агент подчинится). CI fail-closed: незапиненный или изменённый файл роняет сборку (`check-skills.js`). Приёмка стороннего скилла — чеклист в [`SECURITY.md`](SECURITY.md) |
| **Аудит на prompt injection** | `audit-skill-content.js` статически сканирует всё, что агент читает как инструкции (скиллы, правила, агенты) по таксономии атак [garak](https://github.com/NVIDIA/garak): latentinjection, exfiltration, promptinject, encoding. HIGH роняет CI; безобидные совпадения заносятся в allowlist **по sha256 строки** — одобренное исключение умирает в момент изменения своей строки |
| **Внешние тулы (опционально)** | `install.sh --with-tools`: `skillspector` (NVIDIA, security-скан скиллов), `codebase-memory-mcp` (code-graph MCP), `agent-reach` (web-доступ для агента), Paper MCP, `dcg` (destructive command guard — хард-блок `rm -rf` / `reset --hard` / force push / `DROP TABLE` до запуска, PreToolUse-хук поверх kit NEVER-list) — каждый со своим y/N |

> **Режимы активны глобально.** Флаги caveman/RTK/headroom хранятся в `~/.claude/` и действуют во всех проектах одновременно. Включил `/caveman ultra` в одном — он остаётся при переходе в другой. Отключай явно: `/caveman off`, `/headroom off` — эти выключения переживают рестарт сессии.
>
> **RTK — исключение: always-on.** `SessionStart` принудительно возвращает RTK в `on`, игнорируя флаг. `/rtk off` работает, но только **до конца текущей сессии**. Чтобы выключить насовсем — убери форсирование в `.claude/hooks/session-activate.js` (функция `activateRtk`).

---

## Быстрый старт

**Зависимости:** [`node`](https://nodejs.org/) (хуки), [`uv`](https://docs.astral.sh/uv/getting-started/installation/) (Headroom MCP), [`rtk`](https://github.com/rtk-ai/rtk) (RTK — опционально), [`caveman`](https://github.com/JuliusBrussee/caveman), [`headroom`](https://github.com/chopratejas/headroom).

```bash
git clone git@github.com:MFGod/agents-config.git
bash agents-config/install.sh /path/to/your-project
```

Скрипт спросит, какие клиенты установить (Claude Code / Codex / Cursor) и какие стек-правила нужны (React / Vue / FastAPI / Django). Любой выбранный клиент получает общий `AGENTS.md`, `MODELS.md`, правила и skills. Хуки, агенты и MCP доставляются только для выбранного клиентского адаптера. Пользовательские настройки модели, effort, инструкции и изменённые skills сохраняются.

Только общая поставка для Codex, без автоматической настройки его hooks или MCP:

```bash
bash agents-config/install.sh /path/to/your-project --codex-only --yes --stacks all
```

При обновлении installer переносит известные неизменённые копии старого кита в `.agents/backups/`, подключает общий источник и записывает manifest владения файлами. Если старая копия изменена пользователем, сохраняет её и сообщает путь конфликта; `--force` не снимает эту защиту общих файлов.

```text
AGENTS.md
CLAUDE.md                           # @AGENTS.md
.agents/skills/<name>/SKILL.md
.agents/skills/<name>/references/
.agents/skills/<name>/agents/openai.yaml  # policy, если skill явный
.claude/skills/<name>                # ссылка на общий skill внутри проекта
```

На системах без поддержки symlink installer сообщит, какой адаптер не удалось создать. Фактическую загрузку после установки проверяйте в нужном клиенте: общий файл не делает их permissions и tools одинаковыми. Discovery и caveats описаны в [`MODELS.md`](MODELS.md).

Флаг `--with-tools` дополнительно предлагает поставить внешние тулы (skillspector, codebase-memory-mcp, agent-reach, Paper MCP, dcg) — сторонний код с GitHub, каждый со своим подтверждением:

```bash
bash agents-config/install.sh /path/to/your-project --with-tools
```

---

## Источники и лицензии

Всё стороннее, что kit вендорит, ставит как зависимость или предлагает через `--with-tools`. Версии и хеши вендоренных скиллов — в [`skills-lock.json`](skills-lock.json).

### Скиллы (ставятся всегда)

- [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) (Apache 2.0) — `impeccable`: craft / audit / critique / polish / harden / animate
- [`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) — `design-taste-frontend`, `redesign-existing-projects`, `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`
- [`emilkowalski/skills`](https://github.com/emilkowalski/skills) (MIT) — `emil-design-eng`
- [`Kulaxyz/self-learning-skills`](https://github.com/Kulaxyz/self-learning-skills) — `self-learning`
- [`keepsimple.io/uxcore`](https://keepsimple.io/uxcore) — `ux-core` (вендорится указатель на биасы; авторский текст подгружается по ссылке, не копируется)
- [Anthropic prompt-library](https://code.claude.com/docs/en/prompt-library) — `prompt-library`

### Runtime-зависимости (режимы / сжатие токенов)

- [`JuliusBrussee/caveman`](https://github.com/JuliusBrussee/caveman) — caveman mode (output-сжатие); `cavecrew`-агенты произведены отсюда
- [`chopratejas/headroom`](https://github.com/chopratejas/headroom) — Headroom MCP (input-сжатие)
- [`rtk-ai/rtk`](https://github.com/rtk-ai/rtk) — RTK (pre-execution Bash-сжатие)

### MCP серверы (`.mcp.json` для CC, `.cursor/mcp.json` для Cursor)

- [`upstash/context7`](https://github.com/upstash/context7) — `context7` (MIT, npm `@upstash/context7-mcp`): актуальная документация библиотек в промпт — CC + Cursor
- [`microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp) — `playwright` (npm `@playwright/mcp`): браузерная автоматизация, UI-тесты, скриншоты — CC + Cursor
- [`ChromeDevTools/chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp) — `chrome-devtools` (Apache-2.0, npm `chrome-devtools-mcp`): отладка Chrome, Core Web Vitals, network, Lighthouse — рекомендуем, не автоконфигурится (user-add)
- [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers) — официальные reference-MCP: `filesystem` (npm `@modelcontextprotocol/server-filesystem`, только Cursor) и `fetch` (PyPI `mcp-server-fetch` через `uvx`, только Cursor)
- `headroom` — также зарегистрирован как MCP-сервер (см. [`chopratejas/headroom`](https://github.com/chopratejas/headroom) выше) — CC + Cursor

### External tools (`install.sh --with-tools`, opt-in, сторонний код с GitHub)

- [`NVIDIA/skillspector`](https://github.com/NVIDIA/skillspector) — security-скан скиллов (`uv tool install`)
- [`DeusData/codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp) — code-graph MCP
- [`Panniantong/agent-reach`](https://github.com/Panniantong/agent-reach) — web-доступ для агента (`pipx`)
- [`bradautomates/claude-video`](https://github.com/bradautomates/claude-video) — `/watch` видео-анализ (`npx skills add -g`). Тянет `ffmpeg` и `yt-dlp`. **Если у видео нет родных субтитров, аудио уходит на внешний Whisper API** (Groq / OpenAI) — для приватных записей используйте `--no-whisper`
- [`Dicklesworthstone/destructive_command_guard`](https://github.com/Dicklesworthstone/destructive_command_guard) — `dcg`, PreToolUse-хук: хард-блок `rm -rf` / `reset --hard` / force push / `DROP TABLE` (MIT)
- **Paper MCP** — не GitHub-репо; HTTP MCP от Paper Desktop app (`claude mcp add ... http://127.0.0.1:29979/mcp`), требует запущенное desktop-приложение

---

## Документация

| Раздел | Файл |
|--------|------|
| Claude Code — настройки, хуки, режимы, агенты | [`.claude/README.md`](.claude/README.md) |
| История изменений | [`CHANGELOG.md`](CHANGELOG.md) |
| Claude Opus 5.5, Sonnet 5.5 и GPT-6.1 Sol — выбор, effort, prompting, API | [`MODELS.md`](MODELS.md) |
| Общие инструкции для агентов | [`AGENTS.md`](AGENTS.md) |
| Cursor — настройки и хуки | [`.cursor/README.md`](.cursor/README.md) |
| Схема работы системы | [`FLOW.md`](FLOW.md) |

---

## Участие и поддержка

| | |
|--|--|
| Как контрибьютить | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Кодекс поведения | [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) |
| Сообщить об уязвимости | [`SECURITY.md`](SECURITY.md) |
| Лицензия | [MIT](LICENSE) |
