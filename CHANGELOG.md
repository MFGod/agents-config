# Changelog

Все значимые изменения **Cursor kit** (`.cursor/`) и **Claude Code skills** (`.claude/`) документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).  
Версионирование — [Semantic Versioning](https://semver.org/lang/ru/).

Сравнивайте версию в проекте: `.cursor/kit-meta.json` → поле `kitVersion` с [.cursor/kit-version](.cursor/kit-version).

---

## [0.4.0] — 2026-07-14

### Added

- **Skills в Cursor.** Cursor 2.4+ читает Agent Skills из `.cursor/skills/` — тот же `SKILL.md`-стандарт, что и Claude Code. Раньше Cursor получал только правила и хуки; теперь набор скиллов в обоих харнессах одинаковый.
- **Skill `self-learning`** — фиксирует найденный за сессию рабочий маршрут (и отсечённые тупики) как переиспользуемый скилл, чтобы следующая сессия не искала заново.
- **Skill `ux-core`** — 105 когнитивных биасов как обоснование UX-решений. Композится с визуальными скиллами: даёт «почему», а не «как выглядит».
- **Skill `emil-design-eng`** — UI-полировка и решение «нужна ли здесь анимация».
- **Skill `prompt-library`** — 50 шаблонов промптов по фазам SDLC. Вызывается явно (`/prompt-library`). Шесть приёмов формулировки задачи из этой библиотеки вынесены в `global-standards.md` и действуют всегда.
- **Routing-таблица дизайн-скиллов** в `CLAUDE.md` — какой скилл под какую задачу, чтобы агент не тянул несколько пересекающихся сразу.
- **Ревизия скиллов** (`CLAUDE.md`) — обратная процедура к `self-learning`, который умеет только добавлять. При ≥15 скиллах или раз в квартал: жив ли маршрут, срабатывал ли скилл, с кем пересекается, нужен ли автовызов. Протухший скилл хуже отсутствия скилла — следующая сессия ему поверит.
- **`--with-tools`: `dcg`** ([destructive_command_guard](https://github.com/Dicklesworthstone/destructive_command_guard), MIT) — блокирует `rm -rf` / `reset --hard` / force push / `DROP TABLE` до запуска. Хард-enforcement поверх NEVER-list; границы относительно kit-хуков описаны в `global-standards.md`.
- **`--with-tools`: `claude-video`** — `/watch`: анализ видео (YouTube / TikTok / локальные файлы). Без родных субтитров аудио уходит на внешний Whisper API — отключается флагом `--no-whisper`.

### Removed

> **Breaking:** при обновлении эти скиллы исчезнут. Если какой-то используется — скопируйте его до апдейта.

- **15 скиллов** после ревизии реального использования:
  - Написаны под другие харнессы, в Claude Code / Cursor не работают по назначению: `gpt-taste`, `image-to-code`, `stitch-design-taste`.
  - `design-taste-frontend-v1` (legacy-совместимость без legacy), `full-output-enforcement` (актуальные модели вывод не обрезают).
  - Image-gen: `imagegen-frontend-web`, `imagegen-frontend-mobile`, `brandkit`.
  - Motion-heavy: `apple-design`, `animation-vocabulary`, `improve-animations`, `review-animations`. Из этой коллекции остался `emil-design-eng`.
  - Дизайн-гейты `anti-template`, `benchmark`, `innovation-review` — их покрывает агент `design-critic`, причём в отдельном контексте. Скоринг до/после остаётся за `before-after-reviewer`.
- **Skill `animation-emil-kowalski`** — заменён на `emil-design-eng`.
- **Правила `self-learning.mdc`, `ux-core.mdc`, `prompt-library.mdc`** — дубликаты одноимённых скиллов, писались когда Cursor скиллов не умел. Правило с `alwaysApply: true` платит контекстом в каждом промпте; скилл грузится лениво.

### Security

- **Удалён хук `rtk-suggest.sh`.** Он отдавал `permissionDecision: "allow"` — только чтобы показать подсказку. В Claude Code это обход системы разрешений: команды из его таблицы (`curl`, `wget`, `docker`, `kubectl`, `find`) молча автоодобрялись. В `settings-template.json` он не входил, то есть при установке через `install.sh` не доставлялся — затронуты только те, кто копировал `.claude/settings.json` из репозитория напрямую.

### Fixed

- **RTK: `/rtk off` не переживал рестарт сессии.** `SessionStart` принудительно возвращает RTK в `on` — поведение осознанное, но нигде не описанное. Теперь задокументировано (README, `.cursor/AGENTS.md`), включая то, что флаг общий для двух харнессов: выключенный в Cursor RTK включится обратно после старта сессии Claude Code.
- Документация приведена в соответствие с кодом: описание вызова RTK-хука, таблица скиллов Cursor, версия в README.

---

## [0.3.0] — 2026-07-06

### Added

- **Skill `impeccable`** (Paul Bakaus) — команды craft/audit/critique/polish/harden/animate и др. для UI-дизайна. Ставится через `install_claude_core` (`.claude/skills/impeccable`).
- **Skills `taste-skill` x13** (leonxlnx) — `brandkit`, `design-taste-frontend` (+v1), `full-output-enforcement`, `gpt-taste`, `high-end-visual-design`, `image-to-code`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `industrial-brutalist-ui`, `minimalist-ui`, `redesign-existing-projects`, `stitch-design-taste`. Источник — `.agents/skills/*`, копируются как plain-файлы в целевой `.claude/skills/`.
- **Skill `animation-emil-kowalski`** — гайдлайны по UI-анимациям (natural motion, <300ms micro-interactions, transform/opacity only, prefers-reduced-motion, interruptibility) на основе emilkowal.ski/ui/great-animations.
- **`install.sh --with-tools`** — опциональная установка внешних тулов: `skillspector` (NVIDIA, security-скан скиллов), `codebase-memory-mcp` (code-graph MCP), `agent-reach` (бесплатный web-доступ для агента), Paper MCP. Каждый — отдельный y/N, недоступны без явного флага даже под `--yes`.

### Security

- Skillspector CRITICAL-находки на `impeccable` (PE3/P2/P6/LP1 — credential access, hidden instructions, prompt extraction, SSRF) вручную проверены построчно: все false positive (self-referential шум static-скана на собственном антипаттерн-детекторе skill'а). LLM-аудит недоступен (нет API-ключа).

---

## [0.2.0] — 2026-06-25

### Added

- **Agent `design-critic`** — дизайн-критик уровня ex-Stripe/Linear. Блокирует шаблонные решения, требует минимум 3 альтернативы, benchmark против Linear/Stripe/Vercel/Anthropic/Figma. Детектирует паттерны "AI лендинга".
- **Agent `before-after-reviewer`** — обязательный скоринг до/после изменений (7 метрик: иерархия, читаемость, плотность, шум, уникальность, конверсия, мобильность). Блокирует деградацию под видом улучшения.
- **Skill `/innovation-review`** — gate перед реализацией любого UI компонента: 3 стандартных → 3 нестандартных → 3 вне индустрии → constraint design вопрос.
- **Skill `/benchmark`** — сравнение решения с принципами Linear, Stripe, Vercel, Anthropic, Figma. Чеклист "Would Stripe ship this?". Блокирует при ≥3 "нет".
- **Skill `/anti-template`** — 30+ запрещённых шаблонных паттернов (hero 2-колонки, иконки 3x2, "Trusted by", карусель отзывов, и др.). AUTO-BLOCK при HIGH уровне шаблонности.
- **Hook `ux-review.js`** — PostToolUse хук: автоматически выводит 6 UX вопросов при редактировании `.tsx|.vue|.html|.css|.scss|.sass|.less|.jsx|.svelte`. Не блокирует — даёт контекст Claude.

### Changed

- `settings-template.json` — добавлены `post-edit-check.js` и `ux-review.js` в `PostToolUse` hooks.
- `install.sh` — добавлены в список установки: `ui-ux-pro-max`, `innovation-review`, `benchmark`, `anti-template`.

---

## [0.1.0] — 2026-06-17

### Added

- Начальный публичный релиз.
