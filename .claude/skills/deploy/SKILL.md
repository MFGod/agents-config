---
name: deploy
description: >
  Safe deploy workflow: a dev→test→prod checklist that blocks on red tests,
  unmerged MRs, or a missing version tag. Never deploys without an explicit OK from the user.
  Trigger: "/deploy", "задеплой", "deploy", "выкатить на prod", "релиз",
  "push to production", "деплой на стейджинг", "выкатить фичу".
effort: medium
---

# deploy

A deploy without a checklist is roulette. Do not skip phases.

---

## Phase 1 — Pre-deploy checklist

**STOP on any single "no":**

- [ ] **Tests green** in CI/CD or locally on the destination branch.
- [ ] **MRs/PRs merged** — no open MR blocking the release.
- [ ] **Migrations** — if any, already applied in staging before prod. Use `/migrate`.
- [ ] **Version/tag** — prod requires a tag (`v1.2.3`) or an explicit release marker.
- [ ] **Changelog updated** — the user knows what is being deployed.
- [ ] **Rollback plan** — how to revert if prod breaks. Is the previous deploy known?

If any item is "no" → **STOP**, tell the user, do not continue.

---

## Phase 2 — Staging (unless going dev→prod directly)

Sequence: `dev` → `test/staging` → `prod`.

Verify in staging:
- [ ] The app starts without errors (health check endpoint, startup logs).
- [ ] Smoke tests / manual check of the critical user flows.
- [ ] Migrations applied correctly.
- [ ] External integrations (API, queues, S3) work.

**Do not deploy to prod** until staging passes.

---

## Phase 3 — Deploy to the target environment

**Only after an explicit OK from the user.**

Show the command before running it:
```
Деплою в <окружение>: <команда>
```

Typical commands:
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

Deploy logs stay on screen. On error → **STOP**, go to rollback.

---

## Phase 4 — Post-deploy verify

- [ ] **Health check** — HTTP 200 on `/health`, `/ping`, or the home page.
- [ ] **Logs** — no ERROR/CRITICAL in the first 2–3 minutes after the deploy.
- [ ] **Key metrics** — latency, error rate, queue depth show no abnormal rise.
- [ ] **Smoke test** — one critical user flow, by hand.
- [ ] **Version** — the `/version` endpoint or header returns the expected version.

**Exit:** all green → the deploy succeeded.

---

## Emergency rollback

If verify fails, tell the user:

```
СТОП. ROLLBACK.
Окружение: <prod/staging>
Причина: <что сломалось>.
```

Typical rollback:
```bash
# Docker: previous tag
docker compose -f docker-compose.prod.yml pull <image>:<prev-tag>
docker compose -f docker-compose.prod.yml up -d

# Kubernetes
kubectl rollout undo deployment/<name> -n <namespace>

# Git revert + push
git revert HEAD && git push
```

After a rollback — record the incident; do not redeploy without a root cause.
