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
