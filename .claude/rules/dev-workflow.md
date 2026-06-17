<!-- SYNC: .cursor/rules/dev-workflow.mdc -->

# Dev Workflow

## Тестирование

Любое изменение **логики** требует:
1. Написать/обновить тесты (unit/integration/e2e — по стеку проекта).
2. Запустить, показать результат (команда + вывод или ошибка).
3. Тестов нет → предложи минимум, согласуй перед merge.

Без зелёных тестов — не готово. Исключение — только по явной просьбе (зафиксируй).

### Python / FastAPI

- Unit-тесты хранить в папке `test/` в корне проекта.
- Запускать тесты **против экземпляра в Docker Compose**, не на голой машине.
  - Есть `docker-compose.local.yaml` → использовать его.
  - Есть `docker-compose.dev.yaml` → использовать его.
  - Нет ни одного → предупредить пользователя, не запускать локально без явного разрешения.

## Рефакторинг

**Не создавай без пользы:** helpers/hooks/файлы/константы при 1 использовании; микрообёртки; смешение kebab/camel/snake_case.

**Гейт** — хоть одно «нет» → не рефакторить:
- проще, меньше когнитивная нагрузка?
- абстракция оправдана (не «архитектурность»)?
- навигация не усложнена?
- соответствует стилю проекта?

## Безопасность

- validate input; sanitize external data; avoid secrets in code
- не логировать: authorization, token, password, secret, api_key
- HTML из API — только через sanitizer (DOMPurify или аналог)
- Webhook endpoints — проверка secret/header до разбора body

## Зависимости

Новая зависимость — только при необходимости. Предпочти уже используемую. Оцени: maintenance (last release, issues, license), bundle size impact.

## Auto-Review

После завершения BUILD с изменёнными файлами кода (`.js`, `.ts`, `.py`, `.sh`, `.vue`, `.tsx`):

- **≥2 файлов** → спавни `cavecrew-reviewer` с diff изменённых файлов.
- **1 файл** → пропускай (PostToolUse хук уже проверил синтаксис).

Не спавни при: только docs (`.md`), только config (`.json`/`.yaml`), единственный typo fix, активный gstack-workflow (REVIEW фаза сама вызовет reviewer).

Prompt для spawn: `"Review modified files for bugs/risks: <список файлов через git diff --stat HEAD>"`