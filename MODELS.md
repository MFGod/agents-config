# Claude 5.5 и GPT-6.1 Sol: рабочие настройки

Проверено по официальной документации **8 октября 2026**. Рекомендации кита ниже — начальные настройки для проверки на своих задачах, а не обещание одинакового качества при одинаковом effort. Детали API нужны только проектам, которые вызывают модели напрямую: этот kit не содержит такого клиента.

## Выбор модели и effort

| Модель | Точный ID | Default в API | Стартовая рекомендация кита |
|---|---|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` | `medium` | Сложные решения и неоднозначные задачи: `medium`, затем `high` при необходимости |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | `high` | Ограниченные coding-задачи: `medium`; сложные и долгие: `high` |
| GPT-6.1 Sol | `gpt-6.1-sol` | `medium` | Основная работа в Codex: `medium`; сложные проверки: `high` |

Все три API поддерживают `low`, `medium`, `high`, `xhigh`, `max`. GPT-6.1 Sol отвергает `none` и `minimal`. `xhigh`/`max` выбирайте после сравнения результатов; effort не является жёстким лимитом токенов. Модель и доступные уровни в приложении проверяйте отдельно от API. [Opus](https://platform.claude.com/docs/en/models/opus-5-5/overview), [Sonnet](https://platform.claude.com/docs/en/models/sonnet-5-5/overview), [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort), [OpenAI Docs](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

## Claude Code

Opus 5.5 требует Claude Code **2.1.280+**, Sonnet 5.5 — **2.1.284+**. Обновление клиента: `claude update`. Claude Code использует `medium` по умолчанию для обеих моделей, независимо от Sonnet API default `high`.

Новая установка кита получает `"effortLevel": "medium"`. При обновлении installer объединяет только hooks: пользовательские `model` и `effortLevel` сохраняются. Для конкретной сессии:

```text
/model claude-sonnet-5-5
/effort medium
```

Для более сложной задачи:

```text
/model claude-opus-5-5
/effort high
```

Aliases `opus`/`sonnet` на Anthropic API выбирают 5.5; у другого провайдера alias может указывать на старую модель. Полный ID делает выбор явным. `CLAUDE_CODE_EFFORT_LEVEL` может переопределять настройку. `MAX_THINKING_TOKENS=0` и `alwaysThinkingEnabled: false` не отключают thinking на 5.5. `ultrathink` в Claude Code действует на конкретный turn; в прямом API он не заменяет параметр effort. [Model configuration](https://code.claude.com/docs/en/model-config).

В project `.claude/settings.json` поле `effortLevel` действует на 5.5; в user `~/.claude/settings.json` новые модели игнорируют этот legacy default. Для user settings используйте `/model` + `/effort` либо `modelSettings` с полными IDs. Persisted effort допускает `low|medium|high|xhigh`; `max` не сохраняется этим полем. [Settings reference](https://code.claude.com/docs/en/settings-reference#effortlevel).

Существующие Haiku-субагенты остаются дешёвыми исполнителями своих ролей; builder наследует модель основной сессии. Не переводите все роли на Opus без измеримой причины.

## Codex и Cursor

Для Codex, при наличии доступа к GPT-6.1 Sol, модельные поля в начале `.codex/config.toml`:

```toml
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
```

Сохраняйте существующие MCP-секции и настройки доступа. Разовый запуск: `codex --model gpt-6.1-sol --config model_reasoning_effort='"medium"'`. Командная строка имеет приоритет над project config. В приложении проверяйте фактически выбранную модель; поддерживаемые уровни зависят от клиента. [Developer settings](https://learn.chatgpt.com/docs/developer-settings), [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

Codex получает проектные инструкции из общего `AGENTS.md`; он маршрутизирует чтение правил из `.claude/rules/` по задаче. Installer доставляет общие инструкции, `MODELS.md` и `.agents/skills` всем выбранным клиентам. `--codex-only` устанавливает общую поставку без автоматической записи `.codex/config.toml`, hooks и MCP.

Общий `AGENTS.md` теперь возможен и для Claude Code; правила его discovery и совместимости skills описаны ниже. Наличие общего файла не подключает автоматически `.claude/rules` в Codex или настройки одного клиента в другой.

В Cursor выбирайте доступную модель средствами клиента. `effortLevel` Claude Code и `model_reasoning_effort` Codex не настраивают Cursor. Kit доставляет `.cursor/rules/model-efficiency.mdc`; общая справка — корневой `MODELS.md`.

## Постановка задачи и проверка

Используйте один ясный контракт задачи: результат, границы, пример из проекта и критерий приёмки. Пример: «Добавь повтор запроса при 429 в существующий клиент; сохрани обработку остальных ошибок; проверь 429 и успешный повтор тестом в стиле текущего test/».

Для автономной работы обозначайте разрешённые действия и реальные точки подтверждения. Независимые чтения и узкие задания агентам можно выполнять параллельно; зависимые правки требуют последовательности и явного владения файлами. Требуйте фактическую проверку результата; после успешной приёмки дополнительные проверки должны иметь причину. Публичный ответ — краткое объяснение решения и доказательства, без запроса внутренней цепочки рассуждений. Рекомендации GPT-6 guide описывают наблюдения за Astra и предложены как старт для семейства; перенос на Sol нужно оценивать. [GPT-6 prompting](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices), [Opus prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5), [Sonnet prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5).

## Контекст и кеш

Держите постоянные инструкции короткими; подробную справку загружайте по задаче. Для API кеша сохраняйте стабильный prefix и определения инструментов, добавляя новые сообщения в конец истории. Сжатие tool output должно сохранять ошибки и точные ссылки. Opaque thinking/compaction blocks не пересказывайте при replay.

У GPT-6.1 Sol минимальная кешируемая длина — 1024 видимых input tokens; cache read стоит 5% обычного input, cache write — 125%. У Claude 5.5 минимальная длина — 512 tokens. Не раздувайте контекст ради кеша: сравнивайте итоговую стоимость. Compaction уменьшает контекст, но может нарушить reuse prefix; это отдельная оптимизация от Headroom/RTK. [OpenAI caching](https://developers.openai.com/api/docs/guides/prompt-caching), [Claude caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Claude Code practices](https://code.claude.com/docs/en/best-practices).

## Прямой API: совместимость перед миграцией

**Claude 5.5.** Замените manual thinking / `budget_tokens` на adaptive. Opus thinking всегда включён. Sonnet допускает `between_tools` на `high` и ниже, но не `disabled`. Нестандартные `temperature`/`top_p`/`top_k`, assistant prefill и forced `tool_choice: any|tool` отвергаются; используйте `auto`. Разбирайте `content` по типу блоков, сохраняйте неизменную историю thinking и не рассчитывайте на `content[0].text`. Structured tool outputs требуют проверки схемы; доступность `strict` зависит от провайдера. [Opus migration](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide), [Sonnet migration](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide).

Минимальное тело `POST /v1/messages`; для Sonnet замените только model ID. Отсутствие `thinking` включает adaptive по умолчанию. `4096` — пример лимита, включающего thinking и ответ; долгим coding turns нужен больший бюджет.

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 4096,
  "output_config": { "effort": "medium" },
  "messages": [
    { "role": "user", "content": "Сравни два варианта реализации." }
  ]
}
```

Для computer use на Claude API/Google Cloud проверяйте переход `computer_20251124` → `computer_toolset_20260801` и обработку member tools. Старые advisor pairings Sonnet 5.5 могут быть несовместимы. Progress updates по умолчанию могут приходить в скрытых thinking blocks; UI должен выбирать поддерживаемый display mode, если нужны обновления. Это изменения собственных API-клиентов, не hooks этого кита. [Sonnet changes](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5), [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking).

**GPT-6.1 Sol.** Tool calling требует **Responses API**; Chat Completions работает только без tools. Удалите неподдерживаемые sampling/logprob параметры при reasoning: `temperature`, `top_p`, `top_logprobs`; у Chat Completions также `logprobs`, у Responses — `message.output_text.logprobs` из `include`. Сохраняйте tool-call IDs и результаты при продолжении сессии. [Migration](https://developers.openai.com/api/docs/guides/latest-model#migration-quickstart), [Reasoning](https://developers.openai.com/api/docs/guides/reasoning).

Минимальное тело Responses запроса, без SDK и секретов:

```json
{
  "model": "gpt-6.1-sol",
  "reasoning": { "effort": "medium" },
  "input": "Проверь переданный diff и сообщи только доказанные ошибки."
}
```

Не переносите API defaults, beta headers и ограничения одного провайдера в настройки другого клиента автоматически.

## Как оценить улучшение

На одинаковом наборе реальных задач сравните старую и новую настройку: прохождение критериев приёмки, фактически запущенные проверки, время, input/output/reasoning tokens и стоимость с учётом cache writes/reads. Сначала меняйте модель при сопоставимом effort, затем effort отдельно. Включите ограниченный bugfix, неоднозначный review и длинную задачу с tools. Локальные unit/smoke tests проверяют kit; они не измеряют качество ответа модели.

`/caveman-stats` показывает зарегистрированные токены и оценку экономии output. Коэффициент 65% получен на Sonnet 4 и не является измерением для 5.5/Sol. Цены таблицы — стандартный output rate, не итоговый счёт с учётом всех режимов и типов токенов.

## Общий AGENTS.md и переносимость skills

Загрузкой инструкций управляет клиент: Claude Code, Codex или Cursor. Сам выбор модели в Cursor не переключает его на discovery Claude Code/Codex.

| Клиент | Общий `AGENTS.md` | Общие skills в `.agents/skills` |
|---|---|---|
| Claude Code | Native с 2.1.277; для сторонних провайдеров — 2.1.281+ | Нужны skill-folder adapters в `.claude/skills`; этот общий путь не документирован как native root |
| Codex | Native, цепочка от root до cwd | Native |
| Cursor | Native, включая вложенные инструкции | Native; также читает compatibility directories |

Claude по умолчанию выбирает `AGENTS.md`, если на пути cwd → parents нет `CLAUDE.md`, `.claude/CLAUDE.md` или `CLAUDE.local.md`. Для сохранения совместимости старых клиентов корневой `CLAUDE.md` можно сделать одним импортом `@AGENTS.md`, оставив общий текст только в AGENTS. В Claude import/symlink дедуплицируется; в Cursor аналогичная дедупликация не документирована. [Claude memory](https://code.claude.com/docs/en/memory#agentsmd), [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Cursor rules](https://cursor.com/help/customization/rules).

Структура кита с версии 0.6.0, без дублирования активного содержимого skill:

```text
AGENTS.md
CLAUDE.md                           # только @AGENTS.md для совместимости
.agents/skills/review/SKILL.md       # общий workflow
.agents/skills/review/references/    # справка по задаче
.claude/skills/review               # symlink → ../../.agents/skills/review
```

Claude документирует поддержку symlink папки skill. Cursor читает и `.agents`, и `.claude` compatibility roots; его precedence/dedup одинаковых skills нужно проверить на используемой версии, а не предполагать. Hooks, permissions, agent definitions и MCP configuration остаются клиентскими. [Claude skills](https://code.claude.com/docs/en/skills), [Cursor skills](https://cursor.com/help/customization/skills).

Кит содержит 26 общих skills, включая переносимую версию impeccable. Его исходные Claude/Cursor variants сохранены с хешами в `.agents/variants/`, вне каталогов обнаружения; installer их не активирует. Так разные варианты с одинаковым именем не конкурируют при discovery. Адаптер Claude указывает на то же содержимое внутри проекта.

Skills используют ленивую загрузку: сначала metadata, затем body выбранного skill и необходимые references. В Codex начальный список ограничен 2% контекста (или 8000 символами, если размер неизвестен); длинные descriptions сокращаются, часть большого списка может быть исключена с предупреждением. Одинаковые имена не объединяются. Поэтому description должен кратко и точно задавать условие выбора. [OpenAI skill authoring](https://learn.chatgpt.com/docs/build-skills).

Общие `name`, `description` и workflow не означают переносимость всех расширений frontmatter:

| Задача | Claude Code / Cursor | Codex |
|---|---|---|
| Только явный вызов | `disable-model-invocation: true` в SKILL.md | `policy.allow_implicit_invocation: false` в `agents/openai.yaml` |
| Явный вызов | `/skill-name` | `$skill-name` в CLI/IDE, выбор через `/skills` |

`allowed-tools`, `model`, `effort`, `context: fork`, hooks и другие client extensions нельзя считать одинаково поддержанными. В частности, ограничение tools в одном клиенте не обеспечивает такую же защиту в другом. [Claude frontmatter](https://code.claude.com/docs/en/skills#using-skill-frontmatter-outside-claude-code), [Cursor reference](https://cursor.com/docs/skills), [Codex policy](https://learn.chatgpt.com/docs/build-skills#optional-metadata).

Обновлённые рекомендации OpenAI предлагают делать SKILL.md коротким router, выносить детали в references, задавать узкие triggers и пересматривать избыточные обязательные чтения/паузы в AGENTS. Это рекомендации по качеству инструкций; перенос на Sol и другие модели нужно оценивать отдельно. Формат skills и прогрессивная загрузка не появились вместе с GPT-6. [Rethinking skills and prompts](https://learn.chatgpt.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).

Installer сверяет старые файлы с хешами известной поставки и manifest установленного кита. Неизменённые самостоятельные копии перемещаются в backup и заменяются адаптерами; изменённые пользователем сохраняются с указанием конфликта. Для общих файлов `--force` не обходит эту проверку. Integrity checks проверяют canonical source, архивные variants, все payload hashes, безопасные адаптеры и Codex policy; audit также сканирует корневой AGENTS.

После установки перезапустите клиент и проверьте список skills и загрузку AGENTS. Статические проверки и installer tests доказывают структуру и сохранение файлов, но не результат работы конкретной версии модели. Caveman Stats остаётся парсером Claude transcript, а caveman-compress использует Anthropic API/Claude CLI; общий путь skill не создаёт Codex backend.
