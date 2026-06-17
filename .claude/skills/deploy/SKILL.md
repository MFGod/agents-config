---
name: deploy
description: >
  Безопасный deploy workflow: чеклист dev→test→prod с блокировкой при красных тестах,
  несмёрженных MR, отсутствии тега версии. Не деплоит без явного OK пользователя.
  Trigger: "/deploy", "задеплой", "deploy", "выкатить на prod", "релиз",
  "push to production", "деплой на стейджинг", "выкатить фичу".
effort: medium
---

# deploy

Deploy без чеклиста = рулетка. Не пропускай фазы.

---

## Фаза 1 — Pre-deploy checklist

**СТОП если хоть одно «нет»:**

- [ ] **Тесты зелёные** в CI/CD или локально на ветке назначения.
- [ ] **MR/PR смёрджены** — нет open MR, блокирующих релиз.
- [ ] **Миграции** — если есть, выполнены в staging перед prod. Используй `/migrate`.
- [ ] **Версия/тег** — для prod требуется тег (`v1.2.3`) или явная пометка релиза.
- [ ] **Changelog обновлён** — пользователь знает что деплоим.
- [ ] **Rollback план** — как откатить, если prod сломается. Предыдущий деплой известен?

Если хоть один пункт «нет» → **СТОП**, сообщи пользователю, не продолжай.

---

## Фаза 2 — Staging (если не dev→prod напрямую)

Последовательность: `dev` → `test/staging` → `prod`.

Проверь в staging:
- [ ] Приложение стартует без ошибок (health check endpoint, логи запуска).
- [ ] Smoke-тесты / ручная проверка критических пользовательских сценариев.
- [ ] Миграции применились корректно.
- [ ] Внешние интеграции (API, очереди, S3) работают.

**Не деплой в prod** пока staging не прошёл.

---

## Фаза 3 — Deploy в target окружение

**Только после явного OK пользователя.**

Покажи команду до выполнения:
```
Деплою в <окружение>: <команда>
```

Типичные команды:
```bash
# Docker Compose
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d

# Kubernetes
kubectl set image deployment/<name> <container>=<image>:<tag> -n <namespace>
kubectl rollout status deployment/<name> -n <namespace>

# Git-based (Heroku, Render, Railway)
git push <remote> <branch>

# SSH + pull
ssh user@host "cd /app && git pull && systemctl restart app"
```

Логи деплоя — на экране. При ошибке → **СТОП**, переходи к rollback.

---

## Фаза 4 — Post-deploy verify

- [ ] **Health check** — HTTP 200 на `/health`, `/ping` или главной странице.
- [ ] **Логи** — нет ERROR/CRITICAL в первые 2–3 минуты после деплоя.
- [ ] **Ключевые метрики** — latency, error rate, queue depth не выросли аномально.
- [ ] **Smoke-тест** — один критический пользовательский сценарий вручную.
- [ ] **Версия** — `/version` endpoint или заголовок отдаёт ожидаемую версию.

**Выход:** все зелёные → деплой успешен.

---

## Экстренный rollback

Если verify провалился:

```
СТОП. ROLLBACK.
Окружение: <prod/staging>
Причина: <что сломалось>.
```

Типовой откат:
```bash
# Docker: предыдущий тег
docker compose -f docker-compose.prod.yml pull <image>:<prev-tag>
docker compose -f docker-compose.prod.yml up -d

# Kubernetes
kubectl rollout undo deployment/<name> -n <namespace>

# Git revert + push
git revert HEAD && git push
```

После rollback — зафикси инцидент, не деплой снова без root cause.
