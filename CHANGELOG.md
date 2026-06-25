# Changelog

Все значимые изменения **Cursor kit** (`.cursor/`) и **Claude Code skills** (`.claude/`) документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).  
Версионирование — [Semantic Versioning](https://semver.org/lang/ru/).

Сравнивайте версию в проекте: `.cursor/kit-meta.json` → поле `kitVersion` с [.cursor/kit-version](.cursor/kit-version).

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
