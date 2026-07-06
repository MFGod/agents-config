# Changelog

Все значимые изменения **Cursor kit** (`.cursor/`) и **Claude Code skills** (`.claude/`) документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).  
Версионирование — [Semantic Versioning](https://semver.org/lang/ru/).

Сравнивайте версию в проекте: `.cursor/kit-meta.json` → поле `kitVersion` с [.cursor/kit-version](.cursor/kit-version).

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
