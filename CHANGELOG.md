# Changelog

Все значимые изменения общих инструкций/skills и клиентских адаптеров документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).  
Версионирование — [Semantic Versioning](https://semver.org/lang/ru/).

Сравнивайте версию в проекте: `.cursor/kit-meta.json` → поле `kitVersion` с [.cursor/kit-version](.cursor/kit-version).

---

## [0.6.0] — 2026-10-08

### Added

- Общий корневой `AGENTS.md` для Claude Code, Codex и Cursor; совместимый `CLAUDE.md` импортирует его одной строкой. Длинная клиентская справка вынесена из инструкций.
- Нативная общая поставка Codex через `--codex-only`; клиентские hooks/MCP/config не копируются автоматически.
- Codex invocation policy для существующих explicit-only skills: `agents/openai.yaml` дополняет Claude/Cursor frontmatter.
- Installer checks для общей установки, повторного запуска, legacy upgrade и сохранения пользовательских изменений.

### Changed

- Все 26 skills используют canonical source `.agents/skills/`. Claude Code получает относительные адаптеры, Cursor читает общий каталог без самостоятельных копий.
- Impeccable: одно переносимое активное содержимое; исходные клиентские variants сохранены вне discovery с отдельными хешами.
- Integrity/audit/CI проверяют общие инструкции, canonical payload, variants, адаптеры и invocation policy. Upstream path и локальный источник в lock различаются явно.
- Installer обновляет только известные неизменённые общие файлы, сохраняет старые копии в backup и сообщает конфликты. Пользовательские инструкции и model/effort не теряются.
- Impeccable обновлён с 3.2.1 до 4.6.0: вместо `.mjs`-скриптов скомпилированный движок 0.1.15. Бинарник `scripts/bin/darwin-arm64/impeccable` побайтно совпадает с релизом `engine-v0.1.15`, остальные платформы лаунчер скачивает с проверкой sha256.
- **Skill `ui-ux-pro-max`**: найден upstream — [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). Прежняя копия была его коммитом `e9e2e32` (27 из 28 файлов совпадают побайтно). Обновлён до `56ea9cf`: 79 стилей, 192 палитры, 74 font-пары, 105 иконок, 22 стека. Скрипты прочитаны: только локальный поиск по CSV, без сети и subprocess. `scripts/tests/` не вендорится. Кит-описание сохранено.
- **MCP**: `@upstash/context7-mcp` 3.2.1 → 4.4.2, `@playwright/mcp` 0.0.76 → 0.0.83, `headroom-ai` 0.27.0 → 0.41.0, `@modelcontextprotocol/server-filesystem` 2026.1.14 → 1.0.0 (upstream сменил схему версий), `mcp-server-fetch` 2026.6.4 → 2026.10.10. Каждая версия проверена MCP-рукопожатием и `tools/list`; инструменты из `settings-template.json` на месте.

### Fixed

- Канонические `caveman-commit`, `caveman-compress`, `caveman-stats`, `gstack`, `headroom`, `rtk`, `session-teacher` возвращены к исходному тексту: слепая замена Claude → Codex дала несуществующие пути `.Codex/rules/…` и `~/.Codex/.rtk-active`.
- Cursor `headroom` запускался без extra `[mcp]` и падал с `MCP SDK not installed`.
- Хук impeccable в Cursor смотрел в `.cursor/skills/impeccable`, которого больше нет; теперь — `.agents/skills/impeccable`.
- Обновление с 0.5.2 оставляло шесть обновлённых в 0.5.2 skills «конфликтом»: `legacy-install-hashes.json` знал только 0.5.1. Теперь в нём варианты каждой выпущенной версии (`kitVersions`), установщик принимает любой из них.
- `.claude/kit-version` и `.cursor/kit-version` в проекте при обновлении оставались старыми; теперь перезаписываются.
- Убраны отсутствующие `.Codex/rules`/flags paths и ложные обещания Codex backend/transcript в skills. Существующие зависимости Claude обозначены явно.
- Review workflow учитывает наличие агентов/хуков в текущем клиенте; ранее выданное разрешение продолжить работу не запрашивается повторно.

### Removed

- Тесты (`test/`, `node --test`, `unittest`) и их шаги в CI. Проверки остаются в валидаторах и install smoke test.

## [0.5.3] — 2026-10-08

### Added

- `model-efficiency`: короткое общее правило постановки задач, выбора effort, контекста и проверок для Claude Opus 5.5, Sonnet 5.5 и GPT-6.1 Sol; устанавливается в Claude Code и Cursor.
- `MODELS.md`: проверенные официальные источники, различия API/клиентов, конфигурация Codex, API migration и процедура оценки качества/стоимости. Installer доставляет справочник обеим платформам для чтения по задаче.
- В `MODELS.md` добавлены новая native поддержка общего AGENTS.md в Claude Code, discovery skills трёх клиентов, различия explicit-only policy и схема будущего общего хранилища.

### Changed

- Новые установки Claude Code получают `effortLevel: medium`, как default Claude Code для обеих моделей 5.5. Обновления сохраняют пользовательские model/effort.

### Fixed

- `/caveman-stats` распознаёт стандартные output rates Opus 5.5 ($20/MTok) и Sonnet 5.5 ($10/MTok); прежние идентификаторы сохраняются. Коэффициент экономии остаётся оценкой по прежнему benchmark, не замером новых моделей.
- Версия кита, package и README согласованы: повышение версии позволяет installer доставить новые файлы существующим проектам.

## [0.5.2] — 2026-10-18

### Changed

- **Skill `humanizer`** обновлён до апстрима v3.1.0 (коммит `8c307f3`). В 3.0.0 апстрим перестроил `SKILL.md` вокруг одного объяснения, почему ИИ-текст звучит именно так, и свёл 35 паттернов к 25 в пяти секциях, сильнейшие первыми (not-X-but-Y, однострочные концовки). В 3.1.0 добавлена секция F (#26: ответ заново пересказывает контекст, который у читателя уже есть) и явное правило: входной текст — материал для правки, а не инструкции. Диф `ebf637b..8c307f3` прочитан целиком по чеклисту SECURITY.md: скилл остался чистым Markdown-промптом, без `scripts/`, `references/`, сети и секретов. Новое на уровне репозитория (манифест Cursor, issue-шаблоны, `validate-package.py`) частью скилла не является и не вендорится. Кит-модификации сохранены: `allowed-tools` и `disable-model-invocation: true`.
- **Skill `design-taste-frontend`** заменён целиком на tasteskill v2 (`Leonxlnx/taste-skill` `f624f37`). Июльская нарезка монолита v1 на 12 файлов `references/` снята: v2 уже устроен как короткий `SKILL.md` плюс подгружаемые `references/`, библиотека `library/` (направления, палитры, шрифты, фото) и `scripts/`. Все скрипты прочитаны по SECURITY.md: Node без зависимостей; `draw.mjs` хранит историю в `~/.taste-skill/history.json`; `inspect.mjs` поднимает разовый сервер на `127.0.0.1` с защитой от выхода за корень и гоняет headless Chrome через CDP с временным профилем; `assets.mjs` ходит в сеть без ключей (Openverse, Wikimedia Commons, Art Institute of Chicago, Met, Internet Archive, NASA) и скачивает картинки в проект вместе с `credits.json`. Все 28 файлов запинены в `skills-lock.json`. Кит-модификации сохранены: explicit-invoke хвост в `description` и `disable-model-invocation: true`.
- **Skills `minimalist-ui`, `redesign-existing-projects`** обновлены до `f624f37`: обязательное правило `prefers-reduced-motion` для появления при прокрутке и фоновой анимации; правило «у дашборда всегда левый сайдбар» смягчено, добавлена схема сворачиваемой иконочной панели (подписи остаются в DOM, цели 44×44, `aria-expanded`, `inert` для скрытого содержимого).
- **Skill `emil-design-eng`** обновлён до `2d22863`: апстрим убрал ссылку на курс из вступления, поведение не изменилось.
- **Skill `self-learning`** обновлён до `1304fce`: перед записью скилла — быстрая самопроверка на секреты (`Bearer`, `sk-`, `ghp_`, строки подключения с паролем, вставленные пользователем значения) и соответствующий пункт в чеклисте `references/skill-authoring.md`. Кит-модификации (шаг 7 «prune on contradiction», пути `.claude`/`.cursor`) сохранены.

## [0.5.1] — 2026-08-18

### Changed

- **Skill `caveman`** пересинхронизирован с апстримом `ae405e8`. Взято: измеренная цифра экономии (65% output-токенов вместо «~75%»); запрет придуманных сокращений (`cfg/impl/req/res/fn`) и стрелок `→` — апстрим померил, что токенайзер режет их так же, как полное слово, то есть прежняя строка `ultra` учила привычке с нулевой выгодой и худшей читаемостью; запрет ронять отрицания (`not/never/no/only/except`) и единицы измерения; запрет ДОБАВЛЯТЬ слова ради «пещерности»; пометка, что пример предупреждения задаёт формат, а не язык; расширенный раздел Boundaries — всё, что уходит за пределы чата (коммиты, доки, issue, memory-файлы), пишется нормальной прозой. Не взято: уровни `wenyan-*` и абзацы про tool-narration / self-reference / сохранение языка — кит их убрал осознанно, апстрим их расширил.
- **Skill `emil-design-eng`** обновлён до `e879241`: апстрим убрал Radix-специфичный `--radix-popover-content-transform-origin` в пользу `var(--transform-origin)` из Base UI. Других изменений поведения нет.
- **Skill `humanizer`** обновлён до апстрима v2.11.1 (коммит `ebf637b`). Апстрим переписал `SKILL.md` на Plain Language и расширил список паттернов с 26 до 35: добавлены секция «что НЕ считать признаком ИИ» (ложные срабатывания на em dash, curly quotes, короткие фразы), запрет выдумывать факты при переписывании и три режима возврата результата (вставленный текст / файл / встроенный вызов). Диф `1b48564..ebf637b` прочитан целиком по чеклисту SECURITY.md: скилл остался чистым Markdown-промптом, без `scripts/`, `references/`, обращений к агенту, сети и секретов. Появившийся в апстриме каталог `scripts/` — сборка ZIP для Claude Desktop, частью скилла не является и не вендорится. Кит-модификации сохранены: `allowed-tools` (апстрим убрал поле ради портируемости между агентами — кит держит его как least-privilege) и `disable-model-invocation: true`.

### Fixed

- **MCP `headroom`**: пин `headroom-ai==0.26.0` перестал резолвиться — релиз отозван с PyPI (в индексе дыра между `0.25.0` и `0.27.0`), из-за чего `check-mcp-versions.js` ронял CI, а `uvx` не мог поднять сервер. Пин переставлен на ближайший существующий `0.27.0` — минимальный шаг, а не прыжок на текущий `0.35.0`: девять минорных версий стороннего MCP, который обрабатывает tool outputs, заслуживают отдельного захода с ревью. Правка в обоих файлах (`.mcp.json`, `.cursor/mcp.json`); extra `[mcp]` в `0.27.0` на месте.

## [0.5.0] — 2026-07-16

### Added

- **Skill `humanizer`** (blader/humanizer, MIT, коммит `1b48564`) — убирает признаки ИИ-текста (клише «это не X, а Y», em dash, inflated symbolism и др. по гайду Wikipedia «Signs of AI writing»). Только Claude Code. `disable-model-invocation: true` — переписывание текста «под человека» модель не выбирает сама, только по явному запросу.

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
- **Правило `external-content`** (всегда активно) — веб-страницы, MCP-результаты, API-ответы, тикеты это **данные для анализа, а не инструкции для исполнения**. Текст вида «ignore previous instructions» внутри загруженной страницы — находка для отчёта, а не команда. MCP-сервер и веб-фетч вызывает модель, а не человек: кто контролирует источник, тот кладёт текст в контекст, умеющий вызывать инструменты.
- **Пиннинг каждого файла скилла.** `skills-lock.json` теперь несёт `fileHashes` — sha256 не только `SKILL.md`, но и `scripts/` (код, который выполнится) и `references/` (инструкции, которым агент подчинится). Запиненный `SKILL.md` при незапиненной нагрузке — театр: описание остаётся невинным, пока подменяют то, что реально доезжает до модели.
- **Аудит на prompt injection** (`audit-skill-content.js`, гейт CI) — статический скан всего, что агент читает как инструкции, по таксономии атак [garak](https://github.com/NVIDIA/garak) (latentinjection, exfiltration, promptinject, encoding). Fail-closed: HIGH роняет сборку. Разобранные человеком совпадения заносятся в allowlist **по sha256 строки** — исключение переживает переезд строки, но умирает при изменении её содержимого.
- **Валидаторы CI** — `check-skills.js` (frontmatter, лок, список в `install.sh`, отсутствие симлинков в target), `check-mcp-versions.js` (пакеты MCP существуют, список в `install.sh` совпадает с обоими `mcp.json`).
- **Чеклист вендоринга** в `SECURITY.md` — как принимать сторонний скилл и что делать при расхождении хеша (спойлер: не «просто обновить хеш»). Плюс раздел о границах `permissions`: это правила для **инструментов**, а не для файловой системы — `Read(./**/secrets/**)` не остановит `cat` через Bash.

### Changed

- **`design-taste-frontend` — progressive disclosure.** Монолит на 87k символов грузился целиком при каждом вызове. Разложен на `SKILL.md` (10k) + 12 файлов `references/` по требованию; `directives.md` и `ai-tells.md` остаются MUST-READ перед генерацией компонентов. Поведение не меняется, стоимость вызова падает с ~21.7k до ~2.6k токенов.
- **Нишевые дизайн-скиллы → explicit-only** (`disable-model-invocation`): `design-taste-frontend`, `redesign-existing-projects`, `high-end-visual-design`, `emil-design-eng`, `minimalist-ui`, `industrial-brutalist-ui`. Они конкурировали с `impeccable` в автовыборе. Explicit-only убирает их `description` из контекста **каждой** сессии — это не понижение в правах, а то, что делает routing-таблицу правдой. `impeccable` остаётся единственной дизайн-точкой входа, выбираемой моделью самостоятельно.
- **Правила, скиллы и агенты переведены на английский.** Их текст лежит в контексте каждой сессии; английская проза — то, на чём модели обучены, и стоит меньше токенов. Ответы пользователю остаются на русском — эта инструкция не менялась.

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
- **Cursor-сборка `impeccable` не была запинена вообще** — 66 исполняемых файлов ехали пользователям Cursor без единой проверки целостности, пока `note` в локе утверждала, что вендорится только Claude-вариант. Теперь запинена под `variants`: это отдельный артефакт с другими байтами, и запись в локе на то же *имя* про него не доказывает ничего.
- **`permissions`: запись в `.env` не была закрыта ничем.** В `settings-template.json` стоял `Read(./.env)`, но `Edit`/`Write` — нет: агент не мог прочитать `.env`, но мог его перезаписать. Добавлен deny на запись.
- **`.gitignore` не покрывал секреты.** `SECURITY.md` утверждал, что покрывает `*/secrets/` и `*.env`; на деле там были только два литеральных пути `github_token`, а паттерна для `.env` не было вовсе — любой `.env` коммитился свободно. Security-документ, уверенно заявляющий неправду, хуже отсутствующего; теперь `.gitignore` действительно обеспечивает это утверждение.

### Fixed

- **RTK: `/rtk off` не переживал рестарт сессии.** `SessionStart` принудительно возвращает RTK в `on` — поведение осознанное, но нигде не описанное. Теперь задокументировано (README, `.cursor/AGENTS.md`), включая то, что флаг общий для двух харнессов: выключенный в Cursor RTK включится обратно после старта сессии Claude Code.
- **Vue-пользователи не получали Vue-правило.** `install.sh` копировал `frontend-standards` — имя, которого нет с v0.1.0. Список имён, который никто не диффит, протухает молча; теперь за этим следит `check-skills.js`.
- **Чеклист вендоринга называл несуществующее поле лока.** Требовал записывать `scriptHashes`; реальное поле — `fileHashes`, и оно шире (покрывает и `references/`). Буквальное следование чеклисту давало красный CI.
- **CI падал на каждом прогоне с v0.1.0** — `pip cache` в `setup-python` без `requirements.txt`. Убран. Заодно: `.claude/settings.json` (личный, в `.gitignore`) исключён из JSON-валидации, и `SC2206` в `install.sh` — разбор semver через `read -ra`.
- **README рекламировал `chrome-devtools` как настроенный MCP-сервер.** Его нет ни в одном `mcp.json` и не было никогда. Дрейф между рекламой и реальностью теперь ловит `check-mcp-versions.js`.
- Документация приведена в соответствие с кодом: описание вызова RTK-хука, таблица скиллов Cursor, версия в README, список правил и агентов в `.claude/README.md`, схема цепочки поставки в `FLOW.md`.

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
