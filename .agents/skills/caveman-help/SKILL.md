---
name: caveman-help
description: >
  Quick-reference card for all caveman modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /caveman-help,
  "caveman help", "what caveman commands", "how do I use caveman".
effort: low
disable-model-invocation: true
---

<!--
FROZEN SOURCE

Origin Repository: https://github.com/JuliusBrussee/caveman
Origin File: skills/caveman-help/SKILL.md
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
# Caveman — Reference Card

Show the card when invoked. One-shot — do NOT change the mode, do not write flag files, do not persist anything. Output in caveman style.

## Modes

| Mode | Trigger | What it changes |
|------|---------|-----------------|
| **Lite** | `/caveman lite` | Drops filler words. Sentence structure survives. |
| **Full** | `/caveman` | Drops articles, filler, pleasantries, hedging. Fragments OK. Default. |
| **Ultra** | `/caveman ultra` | Extreme compression. Bare fragments. Tables instead of prose. |

The mode holds until changed or the session ends.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **caveman-commit** | `/caveman-commit` | Terse commit messages. Conventional Commits. Subject ≤50 chars. |
| **caveman-review** | `/caveman-review` | One-line PR comments: `L42: bug: user null. Add guard.` |
| **caveman-compress** | `/caveman-compress <file>` | Compresses .md files into caveman prose. Saves ~46% of input tokens. |
| **caveman-help** | `/caveman-help` | This card. |

## Deactivation

Say "stop caveman" or "normal mode". Re-enable with `/caveman`.

## Configuring the default mode

Default = `full`. To change it:

**Environment variable** (highest priority):
```bash
export CAVEMAN_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/caveman/config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation at session start. Manual `/caveman` still works.

Priority: env var > config file > `full`.

## More

Full documentation: https://github.com/JuliusBrussee/caveman
