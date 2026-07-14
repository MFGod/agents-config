# Участие в развитии

Спасибо за интерес к **agents-config**. Документ описывает, как вносить изменения.

## Что это за репозиторий

Это **конфигурационный kit** для AI-агентов (Claude Code + Cursor): правила кодирования, skills, хуки жизненного цикла. Прикладного кода нет — только конфигурация, которая устанавливается в целевые проекты через [`install.sh`](install.sh).

## Перед началом

- Зависимости для локальной проверки: [`node`](https://nodejs.org/) (хуки), [`uv`](https://docs.astral.sh/uv/) (Headroom MCP), опционально [`rtk`](https://github.com/rtk-ai/rtk).
- Изменения обсуждаются через Issues до крупного PR.

## Рабочий процесс

1. Форкни репозиторий и создай ветку от `main`:
   ```
   <type>-<id>-<короткое-описание>
   ```
   Пример: `feat-12-add-go-standards`.
2. Внеси изменения. **Source of truth — `.claude/`**; правила Cursor (`.cursor/rules/*.mdc`) синхронизируются вручную (см. [`.cursor/rules/cursor-kit-maintenance.mdc`](.cursor/rules/cursor-kit-maintenance.mdc)).
3. Подними версию kit **в обоих** файлах: [`.claude/kit-version`](.claude/kit-version) и [`.cursor/kit-version`](.cursor/kit-version) (Semantic Versioning).
4. Добавь запись в [`CHANGELOG.md`](CHANGELOG.md) (формат Keep a Changelog).
5. Прогони тесты, валидаторы и установку — то же, что проверяет CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):
   ```bash
   npm test                                    # node --test (хуки: safety-guard, caveman-stats)
   python3 -m unittest discover -s test        # python-хуки
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
- При добавлении нового skill / rule / hook — пропиши его в [`install.sh`](install.sh) и в [`README.md`](README.md). Для скиллов это не пожелание: `check-skills.js` роняет CI, если скилл не заявлен в `install.sh` или не запинен в `skills-lock.json`.

## Секреты

**Никогда** не коммить токены, ключи, `.env`. Каталоги `secrets/` и любые `.env` — в [`.gitignore`](.gitignore); держи реальные значения только локально. Уязвимость → [`SECURITY.md`](SECURITY.md).

Скиллы и правила записывают только **где найти** секрет (env var, MCP-тул, vault), никогда — сам секрет.

## Код поведения

Участие подразумевает соблюдение [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
