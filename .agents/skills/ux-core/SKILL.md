---
name: ux-core
description: >
  Ground UX/UI and product decisions in named cognitive biases and behavioral
  patterns. Use it when designing or critiquing flows, onboarding, conversion,
  pricing, empty/loading/error states, copy, or navigation — or when the user
  asks "why aren't users doing X", "how do we boost/convert X", "make this more
  intuitive/persuasive", or wants behavioral rationale for a UI choice. Also use
  proactively on design tasks: before proposing a layout/copy/flow, surface the
  1-3 biases most relevant to the decision and name them. 105 biases indexed in
  references/ux-biases.md; fetch the keepsimple.io page for a given bias when you
  need real usage examples. Composes with the design-taste skills
  (impeccable, design-taste-frontend, emil-design-eng, minimalist-ui, etc.) — those
  govern visual craft, this governs behavioral rationale.
metadata:
  author: keepsimple.io (Wolf Alexanyan)
  version: "1.0"
  source: https://keepsimple.io/uxcore
  api: https://api.keepsimple.io/uxcore
---

# UX Core — cognitive biases for UX/product decisions

A reference skill: 105 cognitive biases and behavioral patterns, applied to UX
design and product management. Source: keepsimple.io UX Core (open library,
2020–present). This skill vendors the **index** (bias names + links — facts) and
a **UX-problem → bias cheat-sheet** (this skill's own glosses). It does **not**
reproduce keepsimple's authored descriptions/examples — fetch the page for those.

## When to use

- Designing or critiquing onboarding, conversion, pricing, CTAs, forms, empty/
  loading/error states, navigation, copy.
- User asks "why don't users use feature X", "boost/convert X", "make this
  intuitive/persuasive", "reduce churn", "increase signups".
- You need behavioral rationale to justify a UI choice over an aesthetic one.
- Reviewing a design: name the biases a screen relies on (or violates).

Don't use it for pure visual-taste work — that's the design-taste skills. This
is the *why people act* layer; those are the *how it looks* layer. Use together.

## How to use

- [ ] 1. Identify the UX problem class (memory, attention, trust, decision/value,
      effort/commitment, social proof, self-perception, cognitive load). See the
      cheat-sheet in `references/ux-biases.md`.
- [ ] 2. Match to 1-3 relevant biases from the cheat-sheet. Name them.
- [ ] 3. If you need real-world usage examples or the precise mechanism, fetch
      the bias's keepsimple page: `https://keepsimple.io/uxcore/<slug>` (slugs in
      the index). Or query the index API: `GET https://api.keepsimple.io/uxcore/?lang=en`
      (returns id/number/slug/title/url only — descriptions are on the pages).
- [ ] 4. Propose the design change tied to the named bias, in one line: "use X
      (bias: IKEA effect) because…". Don't pile on biases — pick the load-bearing
      one.
- [ ] 5. Flag when a design *exploits* a bias against the user's interest (dark
      pattern). See ethics below.

## Ethics — protect, don't only manipulate

Cognitive biases cut both ways. Use them to:
- **Reduce friction and cognitive load** for the user (Magical Number 7±2,
  serial-position, peak-end) — help the user.
- **Inform honest design** (loss aversion for genuine warnings, social proof for
  real popularity).

Do **not** use them to manipulate: fake urgency, fake scarcity, confirmatory
framing that hides worse options, friction-as-default (reactance exploitation).
If a proposed pattern would mislead the user, name it as a dark pattern and
propose the honest alternative. This mirrors the kit's `global-standards.md`
posture: respect the user, no hidden side effects.

## Gotchas

- **Names are facts; examples are copyrighted.** The index and cheat-sheet here
  are safe to use. Keepsimple's authored descriptions/usage are not reproduced —
  fetch live when needed, don't paste their text into committed files.
- **One load-bearing bias per decision.** Listing 8 biases is noise; the user
  can't act on a wall of psychology. Pick the one that most changes the design.
- **Biases explain, they don't prove.** "Users will do X because IKEA effect" is
  a hypothesis, not a measurement. Pair with real analytics/A-B where stakes are
  high. See `dev-workflow.md` — verify don't assume.
- **Don't compete with design-taste skills.** `impeccable`/`minimalist-ui` govern
  visual craft; this governs behavioral rationale. Both apply to a screen.
- **Offline.** The index + cheat-sheet work offline. Fetching keepsimple pages
  needs network — degrade gracefully (use the named bias + your own reasoning).
- **Drift.** The 105-bias index is stable (psychology doesn't change fast).
  `skills-lock.json` records provenance; re-pull the API if new biases appear.

Full index (105) + UX-problem cheat-sheet:
[references/ux-biases.md](references/ux-biases.md).