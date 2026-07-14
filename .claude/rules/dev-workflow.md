<!-- SYNC: .cursor/rules/dev-workflow.mdc -->

# Dev Workflow

## Testing

Any change to **logic** requires:
1. Write/update tests (unit/integration/e2e — per the project's stack).
2. Run them, show the result (command + output or error).
3. No tests exist → propose a minimum, agree on it before merge.

Without green tests it is not done. Exception only on explicit request (record it).

### Python / FastAPI

- Keep unit tests in the `test/` directory at the project root.
- Run tests **against the Docker Compose instance**, not on the bare machine.
  - `docker-compose.local.yaml` exists → use it.
  - `docker-compose.dev.yaml` exists → use it.
  - Neither exists → warn the user; do not run locally without explicit permission.

## Refactoring

**Do not create without payoff:** helpers/hooks/files/constants used once; micro-wrappers; mixing kebab/camel/snake_case.

**Gate** — a single "no" → do not refactor:
- simpler, lower cognitive load?
- abstraction justified (not "architecture" for its own sake)?
- navigation not made harder?
- consistent with the project's style?

## Security

- validate input; sanitize external data; avoid secrets in code
- never log: authorization, token, password, secret, api_key
- HTML from an API — only through a sanitizer (DOMPurify or equivalent)
- Webhook endpoints — verify secret/header before parsing the body

## Dependencies

New dependency only on real need. Prefer one already in use. Weigh: maintenance (last release, issues, license), bundle size impact.

## Auto-Review

After finishing BUILD with changed code files (`.js`, `.ts`, `.py`, `.sh`, `.vue`, `.tsx`):

- **≥2 files** → spawn `cavecrew-reviewer` with the diff of the changed files.
- **1 file** → skip (the PostToolUse hook already checked syntax).

Do not spawn for: docs only (`.md`), config only (`.json`/`.yaml`), a single typo fix, or an active gstack-workflow (the REVIEW phase invokes the reviewer itself).

Spawn prompt: `"Review modified files for bugs/risks: <file list from git diff --stat HEAD>"`
