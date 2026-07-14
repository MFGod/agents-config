---
name: migrate
description: >
  Safe migration workflow: Pre-check (backup?) → Dry-run → Rollback plan → Apply → Verify.
  Blocks apply without an explicit rollback plan. Covers DB migrations, data transforms,
  schema changes, API version upgrades. Never runs a migration without an explicit OK from the user.
  Trigger: "/migrate", "запусти миграцию", "migrate", "применить миграцию",
  "schema change", "data migration", "обнови схему", "накати миграцию".
effort: high
---

# migrate

Migrations are irreversible or expensive to undo. Do not skip phases without stating why.

---

## Phase 1 — Pre-check

Before doing anything, gather the answers:

- [ ] **Does a backup exist?** — manual snapshot, pg_dump, mysqldump, S3 backup. If not — **STOP**. Ask the user before continuing.
- [ ] **Which environment** — dev / staging / prod? Prod → elevated risk, explicit confirmation mandatory.
- [ ] **Is downtime needed?** — an ALTER TABLE on a large table locks it; is this online DDL (pt-online-schema-change, pglogical) or a maintenance window?
- [ ] **Dependent services** — is anything reading the old schema right now? Is the migration backward-compatible?
- [ ] **Are tests green?** — run them before applying. Red tests → do not migrate.

**Phase exit:** every item answered, backup confirmed.

---

## Phase 2 — Dry-run

Run the migration in check mode, without applying changes:

```bash
# Django
python manage.py migrate --plan
python manage.py migrate --check

# Alembic
alembic upgrade head --sql   # prints the SQL without executing it

# Flyway
flyway validate
flyway migrate -dryRun

# Prisma
prisma migrate diff --from-schema-datasource --to-schema-datamodel prisma/schema.prisma

# Node / knex
knex migrate:latest --dry-run 2>/dev/null || knex migrate:status
```

Check the output:
- [ ] The SQL/plan looks as expected (no stray DROPs, no unexpected ALTERs).
- [ ] No conflicts with existing data (unique constraints, NOT NULL without a default).
- [ ] The volume of data to transform is what you expected (not an order of magnitude more).

**Phase exit:** the dry-run produced the expected result.

---

## Phase 3 — Rollback Plan

**Mandatory before apply.** Write the plan out explicitly:

```
ROLLBACK PLAN:
1. <rollback command / down migration / restore from backup>
2. <what to restart afterwards>
3. <how to verify the rollback succeeded>
Expected rollback time: <X minutes>
```

Rollback options, most preferred first:
1. **Down migration** (`migrate --rollback`, `alembic downgrade -1`) — ideal, atomic.
2. **Restore from backup** — when no down migration exists.
3. **Manual SQL** — only when 1 and 2 are unavailable; record the exact commands.

If rollback is impossible (an irreversible data transform) — **say so explicitly** to the user before apply.

**Phase exit:** the rollback plan is written down and shown to the user.

---

## Phase 4 — Apply

**Only after an explicit OK from the user.**

Show the command before running it and wait for confirmation, then run it.

During apply:
- [ ] Migration logs on screen (do not run it in the background).
- [ ] On error — **STOP**, do not improvise a fix. Go to rollback.
- [ ] On a partial apply (some steps ran, some didn't) — record the state, ask the user.

---

## Phase 5 — Verify

After apply:

- [ ] **Schema smoke-check** — `\d tablename` / `DESCRIBE table` / `PRAGMA table_info` — the structure matches expectations.
- [ ] **Data** — spot-check that nothing was lost and transforms are correct.
- [ ] **Tests** — run them again. Green → the migration succeeded.
- [ ] **Dependent services** — restart if needed, confirm they read the new schema correctly.

**Exit:** all checkpoints green → migration complete.

---

## Emergency rollback

If something goes wrong in Phase 4–5, tell the user:

```
СТОП. ROLLBACK.
Причина: <что именно пошло не так>.
Выполняю: <rollback plan из Фазы 3>.
```

Execute the rollback. Record what happened. **Do not resume the migration without a fresh pre-check.**
