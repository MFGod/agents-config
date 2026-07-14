# Agents-config v0.4.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platforms: Claude Code + Cursor](https://img.shields.io/badge/platforms-Claude%20Code%20%2B%20Cursor-blue)](#)

Конфигурация для AI-агентов: правила кодирования, skills, хуки жизненного цикла.
Поддерживает **Cursor** (`.cursor/`) и **Claude Code** (`.claude/`).

Ключевые компоненты:

| Компонент | Что делает |
|-----------|-----------|
| **Rules** | Стандарты кодирования — auto-attach по типу файла (React / Vue / Django / FastAPI); git-conventions активен всегда |
| **Skills — паритет платформ** | Один набор скиллов в CC (`.claude/skills/`) и Cursor (`.cursor/skills/`, [Cursor 2.4+](https://cursor.com/docs/skills)): тот же `SKILL.md`-стандарт, автовыбор по `description`, ленивая загрузка тела скилла |
| **Caveman mode** | Сжимает output модели ~75% без потери смысла — CC (с toggle) и Cursor (inject через `sessionStart` хук) |
| **Headroom MCP** | Сжимает input модели (логи, grep, листинги) перед передачей в контекст — CC и Cursor |
| **MCP серверы** | `context7` (документация библиотек); `playwright` (автоматизация браузера: клики, формы, скриншоты, кросс-браузерный); `chrome-devtools` (отладка + производительность: Core Web Vitals, network, Lighthouse) — CC + Cursor; `filesystem`, `fetch` — только Cursor |
| **Safety guard** | `PreToolUse` хук на CC и Cursor (Cursor — ещё legacy `beforeShellExecution`): блокирует `DROP TABLE/DATABASE` и `git push --force` на protected branches (`main/master/dev/test/prod`) |
| **RTK** | Перехватывает Bash-команды через `PreToolUse` hook, переписывает через `rtk` для сжатия вывода — **CC + Cursor** (Cursor получил `preToolUse`) |
| **gstack** | Методология разработки: Think → Plan → Build → Review → Test с FROZEN GATE |
| **Workflow skills** | Структурированные циклы: `/debug`, `/deploy`, `/migrate`, `/session-teacher`, `/caveman-commit` — ставятся всегда (CC + Cursor) |
| **CaveCrew agents** | 4 субагента: `investigator` (поиск кода), `reviewer` (ревью), `tester` (тесты) — на haiku; `builder` (правка 1-2 файлов) наследует main-модель |
| **Design quality pipeline** | `design-critic` — блокирует шаблонные решения, требует 3 альтернативы, benchmark против Linear/Stripe/Vercel; `before-after-reviewer` — скоринг 7 метрик до/после, блокирует деградацию |
| **Design skills** | `/ui-ux-pro-max` — 67 стилей, 96 палитр, 57 font-пар; `/ux-core` — 105 когнитивных биасов как обоснование UX-решений |
| **UX Review hook** | `PostToolUse` хук: автоматически задаёт 6 UX-вопросов при редактировании `.tsx / .vue / .html / .css / .scss / .svelte` |
| **Vendored design skills** | `impeccable` (Paul Bakaus) — универсальная точка входа: craft/audit/critique/polish/harden/animate; `taste-skill` x5 (leonxlnx) — `design-taste-frontend` (новые лендинги), `redesign-existing-projects` (апгрейд существующего), `high-end-visual-design`, плюс `minimalist-ui` / `industrial-brutalist-ui` (explicit-only, заданное визуальное направление); `emil-design-eng` (emilkowalski, MIT) — UI polish + решение «нужна ли анимация» |
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

Скрипт спросит, какие платформы установить (Claude Code / Cursor) и какие стек-правила нужны (React / Vue / FastAPI / Django). Ядро (hooks, agents, global rules, git-conventions, caveman, gstack, headroom, rtk, workflow skills: debug / deploy / migrate / session-teacher, design skills: impeccable / taste-skill / emil-design-eng / ux-core) ставится всегда. Существующие файлы не перезаписываются.

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
| Указатель для агента (Cursor) | [`.cursor/AGENTS.md`](.cursor/AGENTS.md) |
| Схема работы системы | [`FLOW.md`](FLOW.md) |

---

## Участие и поддержка

| | |
|--|--|
| Как контрибьютить | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Кодекс поведения | [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) |
| Сообщить об уязвимости | [`SECURITY.md`](SECURITY.md) |
| Лицензия | [MIT](LICENSE) |
