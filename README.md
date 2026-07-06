# Agents-config v0.3.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platforms: Claude Code + Cursor](https://img.shields.io/badge/platforms-Claude%20Code%20%2B%20Cursor-blue)](#)

Конфигурация для AI-агентов: правила кодирования, skills, хуки жизненного цикла.
Поддерживает **Cursor** (`.cursor/`) и **Claude Code** (`.claude/`).

Ключевые компоненты:

| Компонент | Что делает |
|-----------|-----------|
| **Rules** | Стандарты кодирования — auto-attach по типу файла (React / Vue / Django / FastAPI); git-conventions активен всегда |
| **Caveman mode** | Сжимает output модели ~75% без потери смысла — CC (с toggle) и Cursor (inject через `sessionStart` хук) |
| **Headroom MCP** | Сжимает input модели (логи, grep, листинги) перед передачей в контекст — CC и Cursor |
| **MCP серверы** | `context7` (документация библиотек); `playwright` (автоматизация браузера: клики, формы, скриншоты, кросс-браузерный); `chrome-devtools` (отладка + производительность: Core Web Vitals, network, Lighthouse) — CC + Cursor; `filesystem`, `fetch` — только Cursor |
| **Safety guard** | `PreToolUse` хук на CC и Cursor (Cursor — ещё legacy `beforeShellExecution`): блокирует `DROP TABLE/DATABASE` и `git push --force` на protected branches (`main/master/dev/test/prod`) |
| **RTK** | Перехватывает Bash-команды через `PreToolUse` hook, переписывает через `rtk` для сжатия вывода — **CC + Cursor** (Cursor получил `preToolUse`) |
| **gstack** | Методология разработки: Think → Plan → Build → Review → Test с FROZEN GATE |
| **Workflow skills** | Структурированные циклы: `/debug`, `/deploy`, `/migrate`, `/session-teacher`, `/caveman-commit` — ставятся всегда (CC + Cursor) |
| **CaveCrew agents** | 4 субагента: `investigator` (поиск кода), `reviewer` (ревью), `tester` (тесты) — на haiku; `builder` (правка 1-2 файлов) наследует main-модель |
| **Design quality pipeline** | `design-critic` — блокирует шаблонные решения, требует 3 альтернативы, benchmark против Linear/Stripe/Vercel; `before-after-reviewer` — скоринг 7 метрик до/после, блокирует деградацию |
| **Design skills** | `/ui-ux-pro-max` — 67 стилей, 96 палитр, 57 font-пар; `/innovation-review` — gate перед реализацией (3 варианта обязательно); `/benchmark` — сравнение с топами рынка; `/anti-template` — 30+ запрещённых шаблонных паттернов |
| **UX Review hook** | `PostToolUse` хук: автоматически задаёт 6 UX-вопросов при редактировании `.tsx / .vue / .html / .css / .scss / .svelte` |
| **Vendored design skills** | `impeccable` (Paul Bakaus) — craft/audit/critique/polish/harden/animate; `taste-skill` x13 (leonxlnx) — brandkit, design-taste-frontend, high-end-visual-design и др.; `animation-emil-kowalski` — гайдлайны по UI-анимациям |
| **Внешние тулы (опционально)** | `install.sh --with-tools`: `skillspector` (NVIDIA, security-скан скиллов), `codebase-memory-mcp` (code-graph MCP), `agent-reach` (web-доступ для агента), Paper MCP — каждый со своим y/N |

> **Режимы активны глобально.** Флаги caveman/RTK/headroom хранятся в `~/.claude/` и действуют во всех проектах одновременно. Включил `/caveman ultra` в одном — он остаётся при переходе в другой. Отключай явно: `/caveman off`, `/rtk off`.

---

## Быстрый старт

**Зависимости:** [`node`](https://nodejs.org/) (хуки), [`uv`](https://docs.astral.sh/uv/getting-started/installation/) (Headroom MCP), [`rtk`](https://github.com/rtk-ai/rtk) (RTK — опционально), [`caveman`](https://github.com/JuliusBrussee/caveman), [`headroom`](https://github.com/chopratejas/headroom).

```bash
git clone git@github.com:MFGod/agents-config.git
bash agents-config/install.sh /path/to/your-project
```

Скрипт спросит, какие платформы установить (Claude Code / Cursor) и какие стек-правила нужны (React / Vue / FastAPI / Django). Ядро (hooks, agents, global rules, git-conventions, caveman, gstack, headroom, rtk, workflow skills: debug / deploy / migrate / session-teacher, design skills: impeccable / taste-skill / animation-emil-kowalski) ставится всегда. Существующие файлы не перезаписываются.

Флаг `--with-tools` дополнительно предлагает поставить внешние тулы (skillspector, codebase-memory-mcp, agent-reach, Paper MCP) — сторонний код с GitHub, каждый со своим подтверждением:

```bash
bash agents-config/install.sh /path/to/your-project --with-tools
```

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
