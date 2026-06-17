---
paths:
  - "src/**/*.vue"
  - "src/**/*.css"
  - "src/**/*.scss"
  - "src/**/composables/**/*"
  - "src/**/views/**/*"
  - "src/**/stores/**/*"
---

<!-- SYNC: .cursor/rules/vue-standards.mdc -->

# Vue-стандарты

Дополняет `global-standards.md`. Для React — `react-standards.md`.

**Стек:** Vue 3, TypeScript, JavaScript, HTML5, CSS3/SCSS, Vite/Webpack, REST API, SSR/SSG/SPA/PWA.

## Архитектура

Перед изменениями анализируй: component tree, data flow, state dependencies, composables, routing, UI patterns, rendering impact.

## Компоненты

- Один компонент = одна ответственность. Split smart/dumb. Props: типизированы, минимальны, immutable, explicit defaults.
- Logic в composables при ≥2 местах использования; иначе inline. Исключение: сложная нетривиальная логика >15 строк — можно вынести при одном месте использования.
- Никогда: prop drilling >2-3 уровней; giant components; hidden mutations; side effects в render.

## Vue 3

- Composition API + `script setup`; typed props/emits.
- `computed` для всего синхронного derived state.
- `watch` только для: async-операций, DOM side effects, внешней синхронизации (localStorage, WebSocket, router).
- `ref` для primitives, `reactive` для grouped state.

## TypeScript

- `unknown` вместо `any` при работе с внешними данными
- Явные возвращаемые типы у публичных / экспортируемых функций
- `interface` для публичных контрактов; `type` для unions и aliases

## State management (Pinia)

Предпочитай: local state → composition → composables → Pinia (только если ≥2 несвязанных компонента нуждаются в одних данных).

Pinia: мутации state — **только в actions**; из шаблона и внешнего кода — только через actions. Derived state — через `computed` в store.

## API и формы

- Type responses; handle loading/error/empty/retry.
- Cancellation — `AbortController`: отменяй предыдущий запрос при новом, `controller.abort()` в `onUnmounted`.
- No fetch в render; no silent failures; no ignored race conditions.
- Forms: controlled state, validation, error/loading/disabled. Debounce ≥300ms для поисковых полей; throttle для scroll/resize.

## Стили

- Reusable styles, design tokens, component isolation, mobile-first.
- Нет: magic numbers, `!important`, duplicated styles, deep nesting.

## Рефакторинг

**Не делай:** composable ради однострочной логики; декомпозицию без реальной сложности блока.

## Чеклист

PERFORMANCE CHECK:
- Тяжёлые компоненты/роуты lazy (`defineAsyncComponent`/router lazy)?
- Ненужные ре-рендеры устранены (`v-memo`, `computed`, `shallowRef`)?
- Bundle size проверен после новой зависимости?

ACCESSIBILITY CHECK:
- Интерактивные элементы: `aria-label` или видимый текст?
- Keyboard nav: Tab, Enter, Escape? Focus management после модала?
- Семантические теги, не `div` для интерактивного?
