---
paths:
  - "src/main.py"
  - "src/core/**/*.py"
---

<!-- SYNC: .cursor/rules/python-fastapi-standards.mdc -->

# Python FastAPI

Эталон: сервис-коннектор с `src/main.py`, `core/`, доменными пакетами и HTTP-клиентами.
Дополняет `global-standards.md`. Не смешивай с Django-слоями.

## Структура

```
src/
  main.py          # composition root, FastAPI app, routes
  core/            # config, logger, sentry, api_key
  <domain>/        # бизнес-логика, *Service
  <integration>/   # *client.py — внешние API (httpx)
tests/conftest.py  # env до импорта config
```

## Конфигурация

- `pydantic_settings.BaseSettings`, `SettingsConfigDict(extra="ignore")`.
- Обязательные поля (`str` без default) — падают при старте автоматически.
- Кросс-полевая валидация — `@model_validator(mode="after")`.
- Fail fast: невалидный конфиг → ошибка до приёма трафика.

## FastAPI app

- `FastAPI(lifespan=...)` — startup/shutdown клиентов, stores, tasks.
- Инициализация — в lifespan, не на уровне модуля.
- Состояние процесса — `app.state`.
- Shutdown: `aclose()` клиентов, `cancel` tasks, flush логов.
- `/healthcheck`: GET и HEAD, `include_in_schema=False`.

## HTTP и async

- Handlers тонкие: парсинг → auth → service → маппинг ответа.
- Долгая работа — `BackgroundTasks` или lifespan asyncio tasks.
- Конкурентные операции одного ресурса — `asyncio.Lock` по ключу.
- `httpx.AsyncClient`: один на runtime, явный timeout, не на запрос.

## Безопасность

- API key: `APIKeyHeader` + `HTTPException(401)` при включённом флаге.
- Webhook — проверка secret/header до разбора body.
- Не логировать authorization, token, password, secret, api_key.

## Логирование

- loguru (или принятый structured logger); `traceId` во всех значимых логах.
- JSON в stdout для прод-среды. Raw payloads — только при флаге `LOG_RAW_PAYLOADS`.

## Ошибки

- Доменные исключения: `*Error(RuntimeError)` с `status_code`.
- HTTP mapping в handler/dependency, не разбросан по service.
- Retry только для transient-ошибок (сетевые, 429, 502/503/504); max 3, exponential backoff.

## Тесты

- pytest, `pythonpath = ["src"]` в `pyproject.toml`.
- `conftest.py`: `os.environ.setdefault(...)` **до** импорта модулей, читающих settings при import.
- Unit-тесты service/mapper без поднятия всего app.

## Инструменты

ruff: line-length 100, double quotes; pre-commit: ruff + ruff-format.

## Антипаттерны

- Бизнес-логика в route handlers; sync `requests` в async без `to_thread`.
- `httpx.AsyncClient` на каждый запрос; глобальные singletons вне lifespan.
- Импорт `settings` в тестах без подготовки env в conftest.

## Чеклист

ASYNC/HTTP CHECK:
- `AsyncClient` в lifespan, timeout явный, `Lock` по ключу для конкурентности?
- Retry только transient, не 4xx без rate limit?

LIFECYCLE CHECK:
- lifespan: `aclose()` клиентов, cancel tasks, `/healthcheck` HEAD+GET?
- Нет module-level singletons вне lifespan? Конфиг валидируется до трафика?
