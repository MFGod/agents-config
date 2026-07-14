---
paths:
  - "config/**/*.py"
  - "manage.py"
  - "src/application/**/*.py"
  - "src/api/**/*.py"
  - "src/bootstrap/**/*.py"
  - "src/engine/**/*.py"
  - "src/infra/**/*.py"
  - "src/workers/**/*.py"
  - "src/adapters/**/*.py"
---

<!-- SYNC: .cursor/rules/python-django-standards.mdc -->

# Python Django

Reference implementation: a multi-platform backend with `config/`, layers `api` → `application` → `engine` → `infra`/`adapters`, and Celery workers.
Extends `global-standards.md`. Do not mix with FastAPI patterns.

## Layers and dependencies

| Layer | Responsibility |
|-------|----------------|
| `src/api/` | HTTP views, status codes, parsing, auth webhooks |
| `src/application/` | `ApplicationFacade`, entrypoints, application DTOs |
| `src/engine/` | Dialogue, actions — no direct HTTP/Redis clients |
| `src/infra/` | Redis, HTTP clients, Protocol + Pydantic schemas |
| `src/adapters/` | Platforms (MAX, Telegram, VK) |
| `src/bootstrap/` | Builders, containers, wiring |
| `src/workers/` | Celery tasks, management commands |

Rules:
- `engine` never reaches Redis/HTTP directly — only through ports/infra.
- `engine` may read `django.conf.settings` (flags) — that's fine.
- `api` delegates to the facade — no business logic.
- New integrations — `infra/<name>/protocols.py` + client + schemas + mock.

## Settings

- `config/settings/base.py`, `python-decouple`; secrets from env, never in code.
- Behavior is driven by flags in settings; no branching without a setting behind it.
- Reading `django.conf.settings` in any layer is fine; do not duplicate env reads outside settings.

## Views and API

- Webhook: `@csrf_exempt`, early validation (method, secret, JSON shape), `async def` when the pipeline is async.
- Thin view: parse → log → facade/producer. Responses are `JsonResponse` with explicit status codes.
- DRF: serializers for validation; `permission_classes`.

## Celery

**A critical task** is one that touches user data, notifications, integrations, or billing.

- `acks_late=True`, `reject_on_worker_lost=True` for critical tasks.
- `autoretry_for=(TransientWorkerError,)` — transient only (network, 429/502/503/504, Redis timeout). Permanent failures (ValidationError, business errors) — **do not retry**.
- Payload typed (DTO/dataclass). `bind_request_context(trace_id=self.request.id)` at the start of the task.
- Heavy logic goes in a `*TaskService`; the task itself stays ≤20 lines.

## Infrastructure

- **Logging:** `get_app_logger(__name__)`; structured: `event=`, `fields=`, `context=`; middleware `RequestLoggingContextMiddleware`.
- **ORM:** `select_related`/`prefetch_related` for related queries; `@transaction.atomic` for related writes.
- **Migrations:** a new one after any model change; never edit an applied migration.
- **Integrations:** `typing.Protocol` + client + schemas + mock_client; coercion happens in the client layer, not in the engine.
- **Tooling:** ruff + black, line-length 100, py312; run `ruff check src/ config/` before committing.

## Tests

- `tests/unit/` — isolated logic, mocked protocols.
- `tests/integration/` — workers, redis, task execution.
- `tests/_env.py` — env set **before** importing Django/Celery/src (import it first in conftest.py).

## Anti-patterns

- HTTP straight out of `engine/actions`; a 100+ line Celery task with no service behind it.
- `autoretry_for=(Exception,)` — retrying permanent errors.
- Editing an applied migration.

## Checklist

LAYER BOUNDARY CHECK:
- `engine` makes no HTTP/Redis/Celery calls (infra only)?
- `api` delegates rather than holding logic? New integration: Protocol + client + schemas in `infra/`?

CELERY/QUEUE CHECK:
- Critical task: `acks_late=True`, `reject_on_worker_lost=True`?
- `autoretry_for` limited to `TransientWorkerError`, payload typed, task ≤20 lines?
