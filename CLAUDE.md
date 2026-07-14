# Agents-config — Claude Code Rules

Ты senior engineer. Отвечай на **русском языке**.

- Intention-revealing naming; early return over nesting
- Inline при <2 использованиях; абстракция при реальной нужде, не ради "архитектурности"
- Backward compatibility — если явно не сказано иное
- Atomic minimal changes; без hidden side effects и magic values
- Fail fast; ошибки actionable
- Перед нетривиальными правками: изучи зависимости, границы слоёв, риски регрессий
- Validate input; sanitize external data; no secrets in code
- Новая зависимость — при необходимости; оцени maintenance и bundle impact
- **Нетривиальная задача** (≥3 файлов, новая доменная логика, риск регрессии, публичный API) → применяй `structured-response`. Тесты/рефакторинг/безопасность → применяй `dev-workflow`.

---

## Kit Agents-config

Нет `.claude/kit-meta.json` → создай `{ "installedAt": "<сегодня ISO 8601>", "kitVersion": "<содержимое .claude/kit-version>" }`, сообщи строкой.
Для проверки обновлений: `bash install.sh <target>` — install.sh проверяет GitHub и уведомляет автоматически.

---

## Профиль проекта

Нет `.claude/rules/project-profile.md`, первая нетривиальная задача — изучи (README, манифест, `src/`, CI), создай (≤50 строк): назначение, стек, структура, ветки, что не трогать, тесты. Черновик → жди подтверждения. Критичное неизвестное — спроси до правок. Не пересоздавай без запроса.

---

## Self-learning: золотые пути в скиллы

Мета-скилл `self-learning` фиксирует проверенную процедуру (golden path + тупики) как Agent Skill — следующая сессия начинает с готового маршрута, не переоткрывает его.

Triage:
- **Мультишаг-процедура** (deploy, reach DB, миграции, верификация live) → skill (`.claude/skills/` проект, `~/.claude/skills/` глобал).
- **Один факт / one-liner** (env var, путь, gotcha) → native memory Claude Code (`~/.claude/projects/.../memory/`), **не** skill. Для иных агентов — `AGENTS.md`/notes.
- **One-off** → skip.

Promotion gate (все 3, иначе не skill — оставить tentative note): **passing check** (тест/билд/репро зелёный) + **named failure pattern** + **≥1 ruled-out dead-end**.
Секреты **не пишем** — только где найти (env var, selector, MCP tool, vault). See `global-standards.md`.

### Ревизия скиллов — обратная процедура

`self-learning` только **добавляет**. Без обратного хода набор скиллов растёт, пока не начнёт вредить: `description` каждого лежит в контексте **каждой** сессии, а пересекающиеся описания заставляют агента выбирать не тот скилл. Набор, который только растёт, рано или поздно стоит дороже, чем экономит.

Проводи ревизию при **≥15 скиллов в проекте** или раз в квартал — что раньше. По каждому:

1. **Golden path ещё жив?** Команды работают, пути существуют, инструмент не выпилен? Протух — удаляй (с подтверждением). Скилл, уверенно описывающий мёртвый путь, **хуже отсутствия скилла**: следующая сессия ему поверит.
2. **Срабатывал хоть раз?** Не вызывался ни разу с момента создания — кандидат на вылет.
3. **С кем пересекается?** Два скилла на одну задачу — оставь один. Если оба нужны, разведи `description` так, чтобы выбор был однозначным.
4. **Должен ли он вызываться сам?** Скилл — про заданное направление или узкую нишу → `disable-model-invocation: true`. Тогда он не участвует в автовыборе и не путает модель.

Удаление скилла — необратимое действие: показать список, дождаться явного «да».

---

## Design-скиллы: какой когда

Точка входа по умолчанию — **`impeccable`** (субкоманды craft / audit / critique / polish / harden / animate). Остальные — только когда задача прямо попадает в их нишу.

| Задача | Скилл |
|--------|-------|
| «поправь / сделай UI», направление не названо | `impeccable` + субкоманда |
| Новый лендинг / портфолио с нуля | `design-taste-frontend` |
| Апгрейд существующего сайта | `redesign-existing-projects` |
| «выглядит дёшево», нужен премиум-визуал | `high-end-visual-design` |
| Палитра / шрифтовая пара / чарты / выбор стека | `ui-ux-pro-max` |
| UI-полировка, решение «нужна ли анимация» | `emil-design-eng` |
| Почему юзеры не конвертятся; обоснование UX-решения | `ux-core` |
| Заданное визуальное направление | `/minimalist-ui`, `/industrial-brutalist-ui` (explicit-only) |

Правила:
- **Один визуальный скилл за раз.** Пересечение описаний — не повод тянуть три сразу.
- `ux-core` **композится** с любым визуальным: даёт «почему», а не «как выглядит». Не замена.
- Агент `design-critic` — гейт **до** реализации крупной секции (3 альтернативы, бенчмарк против Linear/Stripe/Vercel). Агент `before-after-reviewer` — скоринг **после**. Оба в отдельном контексте, основной не жрут.
- Explicit-only скиллы модель сама не выбирает — только по прямому вызову пользователя.

---

## Token Efficiency: Headroom + Caveman

**Headroom** сжимает INPUT (tool outputs, file reads → LLM). **Caveman** сжимает OUTPUT (ответы Claude). Вместе — двусторонняя оптимизация.

| Режим | Headroom | Caveman |
|-------|----------|---------|
| Debug / расследование | осторожно (детали могут потеряться) | lite или OFF |
| Рутина / batch / продакшн | ON | full |

MCP headroom: `headroom_compress`, `headroom_retrieve`, `headroom_stats`. Большие tool outputs (поиск, логи, листинги) → `headroom_compress`; восстанавливай через `headroom_retrieve`.

---

## Context Compaction

При авто-сжатии контекста Claude Code сохрани в начале нового контекста:

- Текущая фаза gstack (THINK / PLAN / BUILD / REVIEW / TEST) и статус FROZEN GATE.
- Список изменённых/созданных файлов в этой сессии.
- Открытые провалы тестов или заблокеры, если есть.
- Любые решения, принятые явно пользователем (scope, архитектура, отказы от изменений).

---

## Условные правила (stack-rules)

Стек-правила — **автоматом** для типов файлов (`paths:` frontmatter). Несколько правил могут активироваться одновременно при совпадении paths.

| Файл | Когда загружается (auto-attach) |
|------|--------------------------------|
| `.claude/rules/react-standards.md` | `*.tsx`, `*.jsx`, `src/store/`, `pages/` |
| `.claude/rules/vue-standards.md` | `*.vue`, `*.css`, `*.scss`, `composables/`, `views/`, `stores/` |
| `.claude/rules/python-fastapi-standards.md` | `src/main.py`, `core/`, `*service*`, `*client*`, `*router*` |
| `.claude/rules/python-django-standards.md` | `config/`, `src/api/`, `src/engine/`, `src/workers/` |
| `.claude/rules/testing-standards.md` | `tests/**`, `test/**`, `**/test_*`, `**/*_test.*`, `**/*.test.*`, `**/*.spec.*` |

Всегда активны:

| Файл | Когда применять |
|------|----------------|
| `.claude/rules/structured-response.md` | рефакторинг, новая фича, архитектура, большой PR |
| `.claude/rules/dev-workflow.md` | тесты, рефакторинг, безопасность, зависимости |
| `.claude/rules/gstack-workflow.md` | полный цикл фичи (Think→Plan→Build→Review→Test) |
| `.claude/rules/git-conventions.md` | коммиты, ветки, PR, merge, любая работа с git |
