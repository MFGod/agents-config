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
---
name: caveman-help
description: >
  Quick-reference card for all caveman modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /caveman-help,
  "caveman help", "what caveman commands", "how do I use caveman".
effort: low
---

# Caveman — Справка

Показывать карточку при вызове. Одноразово — НЕ менять режим, не писать файлы флагов, ничего не сохранять. Вывод в стиле caveman.

## Режимы

| Режим | Триггер | Что меняет |
|-------|---------|-----------|
| **Lite** | `/caveman lite` | Убирает мусорные слова. Структура предложений сохраняется. |
| **Full** | `/caveman` | Убирает артикли, мусор, любезности, неуверенность. Фрагменты OK. По умолчанию. |
| **Ultra** | `/caveman ultra` | Экстремальное сжатие. Голые фрагменты. Таблицы вместо текста. |

Режим держится до смены или конца сессии.

## Навыки

| Навык | Триггер | Что делает |
|-------|---------|-----------|
| **caveman-commit** | `/caveman-commit` | Краткие сообщения коммитов. Conventional Commits. Тема ≤50 символов. |
| **caveman-review** | `/caveman-review` | Однострочные комментарии к PR: `L42: bug: user null. Добавь guard.` |
| **caveman-compress** | `/caveman-compress <файл>` | Сжимает .md файлы в caveman-прозу. Экономит ~46% входных токенов. |
| **caveman-help** | `/caveman-help` | Эта карточка. |

## Деактивация

Скажи "stop caveman" или "normal mode". Включить снова: `/caveman`.

## Настройка режима по умолчанию

По умолчанию = `full`. Изменить:

**Переменная окружения** (высший приоритет):
```bash
export CAVEMAN_DEFAULT_MODE=ultra
```

**Файл конфига** (`~/.config/caveman/config.json`):
```json
{ "defaultMode": "lite" }
```

Установи `"off"` — отключит авто-активацию при старте сессии. Ручное включение через `/caveman` всё равно работает.

Приоритет: env var > config file > `full`.

## Подробнее

Полная документация: https://github.com/JuliusBrussee/caveman
