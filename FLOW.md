# Agents-config — Как это работает

## 1. Старт сессии

```mermaid
flowchart LR
    A["Claude Code\nзапускается"] --> B["session-activate.js"]

    B --> C["Caveman: резолвит режим\nenv → config → 'full'"]
    C --> D["Пишет .caveman-active"]
    D --> E["Инжектирует правила caveman"]

    B --> H["Headroom:\nчитает .headroom-active"]
    H --> H1{"ON?"}
    H1 -- да --> H2["Инжектирует правило\ncompression + ToolSearch"]
    H1 -- нет --> F

    B --> R["RTK:\nчитает .rtk-active"]
    R --> R1{"ON?"}
    R1 -- да --> R2["Инжектирует\nRTK ACTIVE"]
    R1 -- нет --> F

    E --> F["✅ Модель готова"]
    H2 --> F
    R2 --> F
```

---

## 2. Каждый промпт пользователя

```mermaid
flowchart LR
    A["Пользователь\nпишет"] --> B["mode-tracker.js"]

    B --> C{"/caveman*?"}
    C -- да --> D["Обновляет\n.caveman-active"]
    C -- нет --> E["Читает флаг"]
    D --> E
    E --> F["Per-turn напоминание\nесли caveman active"]

    B --> CH{"/headroom*?"}
    CH -- да --> DH["Обновляет\n.headroom-active"]
    CH -- нет --> EH["Читает флаг"]
    DH --> EH
    EH --> FH["Per-turn напоминание\nесли headroom active"]

    B --> CR{"/rtk*?"}
    CR -- да --> DR["Обновляет\n.rtk-active"]
    CR -- нет --> ER["Читает флаг"]
    DR --> ER
    ER --> FR["Per-turn напоминание\nесли rtk active"]

    F --> G["🧠 Модель отвечает"]
    FH --> G
    FR --> G
```

---

## 2.5. PreToolUse — RTK rewrite

```mermaid
flowchart LR
    A["Модель вызывает\nBash-инструмент"] --> B["rtk-rewrite.sh"]
    B --> C["Читает флаг\n.rtk-active"]
    C --> D{RTK on?}
    D -- да --> E["rtk rewrite (single source of truth)\n(переписывает команду)"]
    D -- нет --> F["exit 0\n(без изменений)"]
    E --> G["Команда выполняется\nсо сжатым выводом"]
    F --> G
```

---

## 3. Что модель использует при ответе

```mermaid
flowchart TD
    MODEL["🧠 Модель"]

    MODEL --> R["📋 Rules\nавто-загрузка по типу файла"]
    MODEL --> S["🛠️ Skills\nвызов через /skill"]
    MODEL --> A["🤖 Агенты\nспавн при необходимости"]
    MODEL --> H["🗜️ Headroom MCP\nсжатие больших inputs"]
    MODEL --> M["🔌 MCP серверы"]

    M --> M1["context7 — документация библиотек\n(CC + Cursor)"]
    M --> M2["playwright — автоматизация браузера\n(CC + Cursor)"]
    M --> M3["filesystem — файлы проекта\n(только Cursor)"]
    M --> M4["fetch — HTTP / веб\n(только Cursor)"]

    R --> R1["global-standards — всегда"]
    R --> R2["dev-workflow — всегда"]
    R --> R3["gstack-workflow — всегда"]
    R --> R4["structured-response — всегда"]
    R --> R5["git-conventions — всегда"]
    R --> R6["external-content — всегда\nвнешний контент = данные, не инструкции"]
    R --> R7["react / vue / python / testing\nпо расширению файла"]

    S --> S1["/caveman — стиль ответов"]
    S --> S2["/gstack — полный цикл фичи"]
    S --> S3["/caveman-commit — коммит"]
    S --> S4["/caveman-review — ревью PR"]
    S --> S5["/rtk — toggle rewrite Bash"]
    S --> S6["/ui-ux-pro-max — стили, палитры,\nшрифтовые пары"]
    S --> S7["/ux-core — 105 биасов:\nповеденческое обоснование"]
    S --> S8["/self-learning — golden path\nсессии → переиспользуемый скилл"]
    S --> S9["/prompt-library — 50 шаблонов промптов\n(explicit-only; 6 приёмов → global-standards)"]
    S --> S10["impeccable — точка входа в дизайн:\ncraft/audit/critique/polish/harden/animate"]
    S --> S11["taste-skill x5 + emil-design-eng\nexplicit-only: вызов по имени,\nвне автовыбора и вне контекста сессии"]

    A --> A1["investigator — поиск кода\n(haiku, read-only)"]
    A --> A2["builder — правка 1-2 файла\n(наследует main)"]
    A --> A3["reviewer — ревью диффа\n(haiku)"]
    A --> A4["tester — unit-тесты\n(haiku)"]
    A --> A5["design-critic — гейт ДО реализации\nблокирует шаблоны"]
    A --> A6["before-after-reviewer — скоринг\nПОСЛЕ изменений"]
```

---

## 4. Цикл gstack (для крупных задач)

```mermaid
flowchart LR
    T["THINK\nЧто делаем?\nЧто сломается?"]
    P["PLAN\nФайл + шаг + зачем"]
    G{{"🔒 FROZEN GATE\nЖдём: да / ок / погнали"}}
    B["BUILD\nОдин файл до конца\nбез TODO"]
    R["REVIEW\nГраницы слоёв?\nОшибки явные?"]
    TS["TEST\nЗапустить\nПоказать вывод"]

    T --> P --> G --> B --> R --> TS
    B -- "план неверен" --> STOP{{"СТОП\nмини-план → ОК → продолжай"}}
```

---

## 5. Проверка версии кита

Два независимых механизма: один в агенте (каждая сессия), второй в `install.sh` (каждая установка).

### 6a. Session-start check (CLAUDE.md / cursor-kit-maintenance.mdc)

```mermaid
flowchart TD
    A["Старт сессии"] --> B["Читаем .claude/kit-version\n= kitVersion"]
    B --> C{"kit-meta.json\nсуществует?"}
    C -- нет --> D["Создаём kit-meta.json\n{installedAt, kitVersion}\nСообщаем строкой"]
    C -- да --> E{"lastCheckedAt\nбыло < 72ч назад?"}
    D --> Z["✅ Работаем"]
    E -- да --> F["Берём latestVersion\nиз кэша kit-meta.json"]
    E -- нет --> G["curl github.../kit-version\n→ latestVersion\n(таймаут 3с)"]
    G -- ошибка/недоступен --> Z
    G -- OK --> H["Пишем latestVersion +\nlastCheckedAt в kit-meta.json"]
    H --> I{"latestVersion\n> kitVersion?"}
    F --> I
    I -- нет --> Z
    I -- да --> J{"notifiedAt\n< 14 дней назад?"}
    J -- да --> Z
    J -- нет --> K["Напоминаем обновить:\nверсия + ссылка на CHANGELOG"]
    K --> L["Пишем notifiedAt\nв kit-meta.json"]
    L --> Z
```

**Поля kit-meta.json:**

| Поле | Кто пишет | Назначение |
|------|-----------|-----------|
| `installedAt` | `install.sh` | Дата установки; не трогается при проверке версии |
| `kitVersion` | `install.sh` | Версия, которая реально стоит в проекте |
| `latestVersion` | агент (curl) | Последняя версия в репозитории (кэш) |
| `lastCheckedAt` | агент (curl) | Когда был последний curl; управляет кэшом 72ч |
| `notifiedAt` | агент | Когда последний раз напомнили; гард 14 дней |

### 6b. Install-time check (install.sh `check_remote_version`)

```mermaid
flowchart LR
    A["install.sh стартует"] --> B["check_remote_version()"]
    B --> C{"curl доступен?"}
    C -- нет --> Z["Продолжаем"]
    C -- да --> D["curl github.../kit-version\nтаймаут 3с"]
    D -- ошибка --> Z
    D -- OK --> E{"ответ — валидный semver?\n(X.Y или X.Y.Z)"}
    E -- нет --> Z
    E -- да --> F["semver_compare(remote, local)"]
    F --> G{"remote > local?"}
    G -- нет --> Z
    G -- да --> H["Баннер ⚡ Доступна\nновая версия + команда update"]
    H --> Z
```

**Защита от ложных срабатываний:** `check_remote_version` проверяет что ответ соответствует `^[0-9]+\.[0-9]+` — HTML-редирект или ошибка CDN не засчитываются как версия.

---

## 6. Cursor — хуки

### 6a. Старт сессии (sessionStart)

```mermaid
flowchart LR
    A["Cursor\nзапускается"] --> B["caveman-activate.js"]
    A --> H["headroom-activate.js"]
    A --> R["rtk-activate.js"]

    B --> B1{"getDefaultMode()\n= off?"}
    B1 -- да --> B2["exit(0)\n(без инъекции)"]
    B1 -- нет --> B4["additional_context:\nCAVEMAN MODE ACTIVE + правила"]

    H --> H1["additional_context:\nHEADROOM ACTIVE + правила compress"]
    R --> R1["читает/пишет флаг\n.rtk-active (default on)"]

    B2 --> F["✅ Модель готова"]
    B4 --> F
    H1 --> F
    R1 --> F
```

> Cursor поддерживает `sessionStart`, `preToolUse`, `beforeShellExecution` (legacy) и `preCompact`. **Нет UserPromptSubmit** → caveman-mode-tracker и statusline недоступны (per-turn напоминания caveman/headroom/rtk не эмитятся). RTK rewrite **работает** через `preToolUse`.

---

### 6b. Перехват shell-команд (preToolUse + beforeShellExecution)

Cursor вешает на `Shell` два `preToolUse` хука (safety-guard.js → rtk-rewrite.sh) и держит legacy `beforeShellExecution` (safety-guard.sh) для обратной совместимости.

```mermaid
flowchart LR
    A["Модель вызывает\nShell-команду"] --> SG["safety-guard\n(preToolUse + beforeShellExecution)"]
    SG --> C{"safety-guard.js\nнайден?"}
    C -- да --> D["exec node safety-guard.js\n(shared с CC)"]
    C -- нет --> Z["allow\n(fail-open)"]
    D --> E{"Команда\nзаблокирована?"}
    E -- да --> F["permission: deny\nuser_message + agent_message"]
    E -- нет --> RT["rtk-rewrite.sh\n(preToolUse)"]
    Z --> RT
    RT --> RT1{"RTK on?"}
    RT1 -- да --> RT2["exec rtk hook cursor\n(сжатый вывод)"]
    RT1 -- нет --> RT3["exit 0"]
```

**Блокируемые паттерны:** `DROP TABLE/DATABASE`, `git push --force` на protected branches (`main/master/dev/test/prod`).

**Fail-open:** `safety-guard.js` не найден или `node` недоступен → allow. Все Cursor-хуки `failClosed: false`.

---

## 7. Флаг-файлы — единая точка правды (CC)

### Caveman

```
Старт сессии    ──► session-activate.js ──► пишет  ──► ~/.claude/.caveman-active
Каждый промпт   ──► mode-tracker.js ──► читает/обновляет
Statusline (sh) ──► читает ──► показывает [CAVEMAN] в терминале
```

Режим резолвится один раз при старте:
```
CAVEMAN_DEFAULT_MODE (env)  →  ~/.config/caveman/config.json  →  'full'
```

### Headroom

```
Старт сессии    ──► session-activate.js ──► читает/пишет ──► ~/.claude/.headroom-active
                                          └──► инжектирует правило + ToolSearch инструкцию
Каждый промпт   ──► mode-tracker.js ──► читает флаг ──► per-turn напоминание
```

Первый запуск (файл отсутствует) → `"on"` по умолчанию.  
OFF сохраняется между сессиями (как RTK).  
Переключение: `/headroom off` / `/headroom on` / NL (`выключить headroom`, `disable headroom`).

### RTK

```
Старт сессии    ──► session-activate.js ──► читает/пишет ──► ~/.claude/.rtk-active
                                         └──► эмитит статус (RTK ACTIVE / silent)
Каждый промпт   ──► mode-tracker.js ──► детектирует /rtk* → обновляет флаг
PreToolUse      ──► rtk-rewrite.sh ──► читает флаг ──► on → rtk rewrite
```

Первый запуск (файл отсутствует) → `"on"` по умолчанию.  
Переключение: `/rtk off` / `/rtk on` / NL (`выключить rtk`, `disable rtk`).  
Требует бинарь: `rtk` (устанавливается отдельно).

---

## 8. install.sh — внешние тулы (`--with-tools`)

Без флага — не выполняется вообще, даже под `--yes`. С флагом — свой y/N на каждый инструмент, скип с warning если нет нужного бинаря (`uv`/`curl`/`pipx`/`claude`).

```mermaid
flowchart LR
    A["install.sh --with-tools"] --> B{"uv найден?"}
    B -- да --> C["y/N: skillspector\n(NVIDIA, uv tool install)"]
    B -- нет --> C0["warning: skip"]

    A --> D{"curl найден?"}
    D -- да --> E["y/N: codebase-memory-mcp\n(curl|bash официальный installer)"]
    D -- нет --> E0["warning: skip"]

    A --> F{"pipx найден?"}
    F -- да --> G["y/N: agent-reach\n(pipx из GitHub archive)"]
    F -- нет --> G0["warning: skip"]

    A --> H{"claude CLI найден?"}
    H -- да --> I["y/N: Paper MCP\n(claude mcp add, user scope)"]
    H -- нет --> I0["warning: skip"]
```

---

## 9. Цепочка поставки скиллов — что проверяет CI

Скилл доезжает до модели как **инструкции, исполняемые с правами пользователя**. Поэтому вендоренный скилл проходит через лок и два независимых гейта.

```mermaid
flowchart TD
    V["Вендоринг стороннего скилла\n(чеклист в SECURITY.md — читает человек)"] --> L["skills-lock.json"]

    L --> L1["computedHash — sha256 SKILL.md"]
    L --> L2["fileHashes — sha256 КАЖДОГО\nостального файла скилла"]
    L2 --> L2a["scripts/ — код, который выполнится"]
    L2 --> L2b["references/ — инструкции,\nкоторым агент подчинится"]
    L --> L3["variants — вторая сборка\n(Cursor-копия impeccable)"]

    L --> CI{"CI"}
    CI --> C1["check-skills.js\nфайл изменён или не запинен → красный"]
    CI --> C2["audit-skill-content.js\nстатический скан по таксономии garak"]

    C2 --> C2a["HIGH → CI падает"]
    C2 --> C2b["Разобранное человеком →\nallowlist по sha256 СТРОКИ"]
    C2b --> C2c["Строка изменилась —\nисключение умирает"]
```

**Чего это НЕ ловит.** Лок ловит *подмену* запиненного скилла и *появление* незапиненного. Он не ловит вредоносный код, запиненный с самого начала. `node --check` и `ruff` проверяют синтаксис, а не намерение. Единственный барьер на входе — человек, прочитавший `SKILL.md` и `scripts/` целиком (чеклист в [`SECURITY.md`](SECURITY.md)).
