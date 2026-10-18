# Участие в развитии

Спасибо за интерес к **agents-config**. Документ описывает, как вносить изменения.

## Что это за репозиторий

Это **конфигурационный kit** для Claude Code, Codex и Cursor: общие инструкции и skills, клиентские правила и хуки. Поставка устанавливается через [`install.sh`](install.sh).

## Перед началом

- Зависимости для локальной проверки: [`node`](https://nodejs.org/) (хуки), [`uv`](https://docs.astral.sh/uv/) (Headroom MCP), опционально [`rtk`](https://github.com/rtk-ai/rtk).
- Изменения обсуждаются через Issues до крупного PR.

## Рабочий процесс

1. Форкни репозиторий и создай ветку от `main`:
   ```
   <type>-<id>-<короткое-описание>
   ```
   Пример: `feat-12-add-go-standards`.
2. Внеси изменения. Общие инструкции — `AGENTS.md`, skills — `.agents/skills/`. `.claude/skills/` содержит адаптеры; архив исходных impeccable variants — `.agents/variants/`, вне discovery. Общий текст правил — `.claude/rules/`; Cursor `.mdc` синхронизируются и проверяются отдельно.
3. Подними версию [.claude/kit-version](.claude/kit-version) и `package.json` (Semantic Versioning); `.cursor/kit-version` — ссылка на общий номер.
4. Добавь запись в [`CHANGELOG.md`](CHANGELOG.md) (формат Keep a Changelog).
5. Прогони валидаторы и установку — то же, что проверяет CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):
   ```bash
   node .claude/scripts/check-skills.js        # frontmatter, skills-lock, install.sh, симлинки
   node .claude/scripts/check-cursor-sync.js   # .claude/rules ↔ .cursor/rules
   node .claude/scripts/check-mcp-versions.js  # MCP-пакеты существуют, списки совпадают
   node .claude/scripts/audit-skill-content.js # статический аудит на prompt injection
   bash install.sh /tmp/test-project --yes --stacks all
   ```
6. Открой Pull Request в `main`.

## Вендоринг стороннего skill

Скилл — не текст, а инструкции, исполняемые **с правами пользователя**. Прежде чем добавлять чужой скилл, пройди чеклист приёмки в [`SECURITY.md`](SECURITY.md): прочитать `SKILL.md` и каждый файл в `scripts/` целиком, зафиксировать провенанс (коммит, не ветку), записать `computedHash` + `fileHashes` в [`skills-lock.json`](skills-lock.json), задокументировать каждую kit-правку в `note`.

Расхождение хеша — **не** повод «просто обновить хеш»: сначала прочитай diff целиком. Хеш, обновлённый не глядя, — ровно тот rug pull, от которого лок и защищает.

## Стандарты

- **Коммиты** — [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`. Типы: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `revert`. Подробнее — [`.claude/rules/git-conventions.md`](.claude/rules/git-conventions.md).
- **Один PR = одно логическое изменение.** Не смешивай фичи.
- **Размер PR** ≤400 строк diff (исключение: auto-generated, lockfiles).
- **Описание PR**: что изменено, почему, как проверить.
- При добавлении skill / rule / hook обнови поставку и [`README.md`](README.md). Общие skills обнаруживаются installer из `.agents/skills/`; их имена, метаданные, адаптеры, explicit-only policy и provenance проверяет `check-skills.js`.
- В lock сохраняй upstream `skillPath`, а локальный источник указывай в `localPath`. Сторонний payload и архивные variants должны быть полностью запинены; перенос не разрешает сбрасывать проверки целостности.

## Секреты

**Никогда** не коммить токены, ключи, `.env`. Каталоги `secrets/` и любые `.env` — в [`.gitignore`](.gitignore); держи реальные значения только локально. Уязвимость → [`SECURITY.md`](SECURITY.md).

Скиллы и правила записывают только **где найти** секрет (env var, MCP-тул, vault), никогда — сам секрет.

## Код поведения

Участие подразумевает соблюдение [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
