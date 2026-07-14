---
description: Structured response (ANALYSIS/PLAN/…) for refactoring, new features, architecture, PR review, migrations, and non-trivial logic changes. Not for small edits, code search, questions without changes, or one-line fixes.
---

<!-- SYNC: .cursor/rules/structured-response.mdc -->

# Structured Response Format

## When to apply

The task is non-trivial (see `global-standards.md`) and at least one holds:
- ≥3 files with logic
- new domain logic / changes a public API or contract
- refactoring with regression risk (layers, migrations, types)
- the user explicitly asks for analysis

Simple request → a short answer **without** the sections below.

## Format

Non-empty sections only. Depth: 3–7 bullets; `PLAN` — numbered steps.

```
ANALYSIS:
- What the current code does and why that is a problem / what is missing.
- Dependencies, layers, components the change will touch.
- Constraints and assumptions.

PLAN:
1. First step (file, what changes, why).
2. Second step.
...

IMPLEMENTATION:
- Key decisions, patterns, contracts chosen.
- What is NOT changing, and why.

CLEAN CODE CHECK:
- No superfluous abstractions (a function/file earns its place at ≥2 uses)?
- Intention-revealing naming?
- No mixing of layers?

RISKS:
- Possible regressions and where to check them.
- Edge cases that could break.

TEST PLAN:
- Unit: what to mock, what to assert.
- Integration: what to run.

CODE:
<patch or fragment — only if needed to agree on the approach>

REVIEW NOTES:
- What to look at during review.
- What is deferred to the next PR.
```
