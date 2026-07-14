---
name: debug
description: >
  Structured debugging workflow: Feedback Loop → Reproduce → Hypothesise → Instrument → Fix → Cleanup.
  Forbids moving to the next phase without meeting its explicit exit condition.
  Trigger: "/debug", "отладь", "дебаг", "не работает", "ошибка", "баг", "debug this",
  "почему падает", "найди причину", "investigate", "разберись с ошибкой", "что сломалось".
effort: medium
---

# debug

A disciplined workflow for hard bugs. Do not skip phases without stating why.

---

## Phase 1 — Feedback Loop

**This is the whole skill. The rest is mechanics.**

Given a fast, deterministic, agent-runnable pass/fail signal, the bug will be found. Without one, no amount of code reading will save you.

Spend disproportionate effort here. Be aggressive. Do not give up.

### Ways to build the loop — try in this order

1. **Failing test** at the right seam — unit, integration, e2e.
2. **curl / HTTP script** against a running dev server.
3. **CLI invocation** with fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser** (Playwright) — clicks the UI, checks DOM/console/network.
5. **Replay a captured trace** — save a real request/payload/event log, run it in isolation.
6. **Throwaway harness** — a minimal subset of the system (one service, mocks), driven by a single function call.
7. **Property / fuzz loop** — for "sometimes the output is wrong": 1000 random inputs.
8. **Bisection harness** — if the bug appeared between two states: automate `git bisect run`.
9. **Differential loop** — one input through the old vs new version, diff the outputs.
10. **HITL bash script** — last resort: if a human is required, structure their actions with a script.

### Iterating on the loop

- Can it be faster? (cache setup, narrow the scope)
- Can the signal be sharper? (assert on the symptom, not on "it didn't crash")
- Can it be more deterministic? (pin the clock, seed the RNG, isolate the FS, freeze the network)

A 30-second flaky loop is nearly useless. A 2-second deterministic one is a superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **high reproduction rate**. Run it 100×, add stress, narrow the timing window. A 50% flake is debuggable; a 1% flake is not. Raise the rate until it is.

### If you cannot build a loop

Stop. Say so plainly. List what you tried. Ask the user for: (a) access to the environment, (b) a captured artifact (HAR, log dump, screen recording), (c) permission for temporary prod instrumentation. **Do not proceed to Hypothesise without a loop.**

---

## Phase 2 — Reproduce

Run the loop. Confirm:

- [ ] The bug matches what the user described — not a neighbouring bug.
- [ ] It reproduces reliably (or at a sufficient rate).
- [ ] The exact symptom is captured (error message, wrong output, timing).

Do not move on without a reproduction.

---

## Phase 3 — Hypothesise

Write **3–5 ranked hypotheses** before testing any of them.

Every hypothesis must be **falsifiable**:

> "If X is the cause, then changing Y makes the bug disappear / changing Z makes it worse."

If you cannot state a prediction, it is not a hypothesis — it is a vibe. Discard it or sharpen it.

**Show the list to the user before testing** — they may hold domain knowledge that re-ranks it instantly. If the user is unavailable, proceed on your own ranking.

**Exit:** the hypothesis list is confirmed, or the user has re-ranked it.

---

## Phase 4 — Instrument

Every probe maps to a specific hypothesis from Phase 3. **Change one variable at a time.**

Tool priority:
1. **Debugger / REPL** — one breakpoint beats ten log lines.
2. **Targeted logs** at the boundaries that separate the hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix: `[DEBUG-xxxx]` (4 chars, per session, e.g. `[DEBUG-a4f2]`). Cleanup is then a single grep. Untagged logs survive; tagged ones die.

**Perf regressions:** logs are useless here. Build a timing harness, run a profiler, read the query plan. Measure first, fix second.

**Exit:** one hypothesis confirmed or refuted. If none are, return to Hypothesise with the new data.

---

## Phase 5 — Fix + Regression Test

Write the regression test **before the fix** — but only if a **correct seam** exists.

A correct seam: the test reproduces the real bug pattern the way it arises at the call site. If the seam is too small (a unit test cannot reproduce the chain), the test gives false confidence.

**No correct seam is itself a finding.** Record it: the architecture prevents pinning this bug with a test. Carry it into the post-mortem.

With a seam:
1. Turn the minimised repro into a failing test.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Run the Phase 1 loop against the original (not minimised) scenario.

**Exit:** the Phase 1 loop passes on the original scenario.

---

## Phase 6 — Cleanup + Post-Mortem

Before declaring done:

- [ ] The original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] The regression test passes (or the missing seam is documented)
- [ ] Every `[DEBUG-...]` is removed (`grep` for the prefix)
- [ ] Throwaway prototypes are deleted or marked
- [ ] The confirmed hypothesis is written into the commit / PR message — the next debugger should learn from it

Then ask: **what would have prevented this bug?** If the answer requires architectural change, deliver the recommendation after the fix, not before.
