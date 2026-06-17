<!--
FROZEN SOURCE

Origin Repository: https://github.com/JuliusBrussee/caveman
Origin File: skills/caveman-stats/SKILL.md
Origin Commit/Tag: 25d22f864ad68cc447a4cb93aefde918aa4aec9f (main, 2026-06-12)

Status: Modified

This file is based on an external implementation.
Before making changes:
1. Compare with the original source.
2. Verify that upstream behavior is preserved.
3. Check for upstream updates or fixes.
4. Document reasons for any divergence.

Do not refactor, simplify, optimize, or rewrite this file
without understanding the original implementation and its intent.
-->
---
name: caveman-stats
description: >
  Show real token usage and estimated savings for the current session.
  Reads directly from the Claude Code session log — no AI estimation.
  Triggers on /caveman-stats. Output is injected by the mode-tracker hook;
  the model itself does not compute the numbers.
effort: low
---

This skill is delivered by `hooks/caveman-stats.js` (read by `hooks/mode-tracker.js` on `/caveman-stats`). The model does not need to do anything when this skill fires — the hook returns `decision: "block"` with the formatted stats as the reason. The user sees the numbers immediately.
