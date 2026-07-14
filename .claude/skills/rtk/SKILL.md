---
name: rtk
description: >
  Toggle RTK (Rust Token Killer) pre-execution command compression on/off.
  Use when user says "/rtk", "/rtk on", "/rtk off",
  "включить rtk", "выключить rtk", "rtk off", "rtk on".
effort: low
---

# RTK (Rust Token Killer)

RTK intercepts Bash commands through a PreToolUse hook and rewrites them to compress their output.
It works at the command-execution level — independent of Caveman and Headroom.

## Commands

- `/rtk` or `/rtk on` — enable rewriting
- `/rtk off` — disable

## Modes

| Mode | Behavior |
|------|----------|
| `on` | Rewrites: `git status` → `rtk git status` |
| `off` | Commands run unchanged |

## How it works

The `mode-tracker.js` hook processes the command and updates the `~/.claude/.rtk-active` flag
**before** the model replies. `rtk-rewrite.sh` reads that flag on every Bash call.

Determine the new status from the user's intent:
- `/rtk off`, "выключить rtk", "disable rtk" → **OFF** — report: "RTK OFF. Команды выполняются без переписывания."
- `/rtk on`, `/rtk`, "включить rtk", "enable rtk" → **ON** — report: "RTK ON. Bash-команды автоматически оптимизируются."

## Stats

```bash
rtk gain           # token savings for the session
rtk gain --graph   # ASCII graph over 30 days
```
