<!-- SYNC: .cursor/rules/git-conventions.mdc -->

# Git Conventions

Extends `global-standards.md`. Apply to any git work.

## Branches

**Protected:** `dev`, `test`, `prod` — direct push to any of them is forbidden. Only via MR/PR, whatever the source branch.

Working branches are created from `dev`:

```
dev-<id>-<short-description>
```

Examples: `dev-10002-check-version`, `dev-14432-pwa-updates`, `dev-03-auth-fix`

- `<id>` — task identifier (ticket number, sprint, or sequence number)
- `<description>` — kebab-case, ≤4 words, the gist of the task

**NEVER** `git push` directly to `dev` / `test` / `prod` — not even from a `dev-*` working branch. MR/PR only.

## Commits — Conventional Commits

Format: `<type>(<scope>): <subject>`

| Type | When |
|------|------|
| `feat` | new feature |
| `fix` | bug fix |
| `chore` | tooling, deps, config |
| `refactor` | no behavior change |
| `docs` | documentation only |
| `test` | tests, no prod logic |
| `perf` | performance |
| `revert` | reverting a commit |

- Subject ≤50 characters, lowercase, no trailing period.
- Body only when the "why" is not obvious from the subject.
- Breaking change: `<type>(<scope>)!: <subject>` or `BREAKING CHANGE:` in the body.
- **NEVER** `git add .` / `git add -A` — stage explicitly, by filename.
- One commit = one logical change (atomicity).

## Pull Request

- Size ≤400 diff lines (exception: auto-generated, migrations, lockfiles).
- One PR = one atom of change; do not mix features.
- Title: `<type>(<scope>): <what was done>` — same as a commit message.
- Description: **what** changed, **why**, **how to verify**.
- **NEVER** force push to shared branches (`dev`, `test`, `prod`).

## Environments and branches

| Branch | Environment | Purpose |
|--------|-------------|---------|
| `dev` | Development | Feature integration, active development |
| `test` | Staging / QA | Testing before release |
| `prod` | Production | Stable release |

## Merge strategy

- Feature/fix → `dev`: squash merge (clean history).
- `dev` → `test`: merge commit (QA integration point).
- `test` → `prod`: merge commit (only after QA).
- Hotfix: branch from `prod` → MR into `prod` → cherry-pick / merge back into `test` and `dev`.

## Confirmation protocol before an irreversible action

A user request ("commit it", "push it") is **not sufficient on its own**. An explicit confirmation of the content is required.

### Protection levels

| Situation | Protocol |
|-----------|----------|
| commit on a `dev-*` / feature branch | Show `type(scope): subject` → "Коммитим?" |
| commit on a protected or unknown branch | Full ritual (below) |
| push `dev-*` → remote | Show branch + number of commits ahead → "Пушить?" |
| push to protected / `--force-with-lease` / prod | Full ritual + name the risk |

### Full ritual — when it applies: protected branch, force, prod

**git commit:**
1. Run `git diff --cached --stat` and show the file list.
2. Show the draft message: `` `type(scope): subject` ``.
3. Ask explicitly: **"Подтверждаешь?"** — and wait for an answer.
4. Only after **"да" / "ок" / "погнали"** — run `git commit`.

If the user wants to change the message or exclude a file — take the correction and re-confirm.

**git push:**
1. Show: source branch, destination branch, number of commits ahead (`git log origin/<branch>..HEAD --oneline`).
2. Ask explicitly: **"Пушить?"** — and wait.
3. Only after an explicit "yes" — run `git push`.

### Irreversible actions (prod / migrate / deploy)

For a prod branch, `git push --force-with-lease`, applying migrations, or deploying to prod, naming the risk is also required:

```
Это необратимо (или трудно откатить). Ветка: prod. Последствие: ...
Продолжаю только после явного "да".
```

## Agent constraints

**NEVER** create a commit without an explicit user request.
**NEVER** push (`git push`) without an explicit request.
**NEVER** force push without explicit confirmation — not even `--force-with-lease`.
**NEVER** delete a branch (`-D`) without explicit confirmation.
**NEVER** skip the confirmation protocol above — even if the user said "commit everything".
