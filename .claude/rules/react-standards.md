---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "src/store/**/*"
  - "src/pages/**/*"
  - "src/entities/**/*"
  - "src/hooks/**/*"
---

<!-- SYNC: .cursor/rules/react-standards.mdc -->

# React-стандарты

Эталон: React 18 TWA/VK Mini App (TypeScript strict, MobX, Webpack).
Дополняет `global-standards.md`. Для Vue — `vue-standards.md`.

**Стек:** React 18, TypeScript strict, MobX 6 + mobx-react, Webpack, React Router 6, axios / `@kts-front/call-api`, Sentry, SCSS modules / styled-components.

## Структура `src/`

`main.tsx` (entry) · `vk/App.tsx, tg/App.tsx` (multi-platform) · `pages/` · `components/common/ layout/ modals/` · `store/globals/` (RootStore, ApiStore, BasePageStore) · `store/locals/` (page stores) · `store/models/` · `store/hooks/` · `entities/` · `config/` · `utils/` (lazyWithRetry, performance, defer).

## MobX

- `RootStore` — composition root; page stores `extends BasePageStore` (`store/globals/BasePageStore`).
- Компоненты, читающие store, — `observer()` из `mobx-react`.
- Бизнес-логика и API — в stores, не в JSX.
- Derived UI state — `React.useMemo`, не дублируй store state.

## Компоненты

- `React.FC<Props>` с явным типом. Один компонент на файл (`react/no-multi-comp`).
- Презентационные — без store. Connected — `observer` + `use*Store`.
- `clsx` для условных классов. `lazyWithRetry` + `React.Suspense` для тяжёлых страниц.

## Стили (выбор фиксируется на уровне проекта)

По умолчанию `ComponentName.module.scss`. Если проект на styled-components — `*.styles.ts`. Не смешивать в одном компоненте.

## API

- HTTP через `ApiStore`: `baseUrl` из config, Bearer в `getAuthorizationCallback`.
- Ошибки — типизированные `ErrorResponse`, обработка в store, UI отображает state.
- Не вызывать axios/fetch напрямую из компонентов.

## Multi-platform (TWA / VK)

Отдельные `App.tsx` на платформу; `init(platform, App)` в `main.tsx`. Platform-ветки в shared components — только через `appParamsStore` (`store/globals/AppParamsStore`).

## Ошибки и устойчивость

- Error boundaries: `withErrorBoundary` на критичных деревьях.
- `ChunkLoadError` — глобальный handler + reload.
- `appState`: loading/success/error — единый источник; не white screen.
- HTML из API — только `DOMPurify.sanitize(html)`.

## Хуки

`useEffect` — только sync/subscription/timer/init, не для derived state или бизнес-логики.
`useCallback` — для handlers в observer-компонентах (предотвращает лишние ре-рендеры).
Debounce — через `useRef`, не новый таймер в каждом render.
`eslint-disable exhaustive-deps` — только с комментарием why.

## Инструменты

`yarn tsc:check` перед коммитом; eslint + prettier + stylelint; max-len 100; husky + lint-staged.

## TypeScript

- `unknown` вместо `any` при работе с внешними данными
- Явные возвращаемые типы у публичных / экспортируемых функций
- `interface` для публичных контрактов; `type` для unions и aliases

## Антипаттерны

- API calls в JSX; `useState` для global state на MobX-проекте; fetch в render.
- Giant components (>200 строк); игнор chunk errors после deploy.

## Чеклист

REACT HOOKS CHECK:
- `useEffect` только sync/sub/timer/init; deps соблюдены; `useCallback` для observer-детей?

MOBX CHECK:
- Все reader-компоненты в `observer()`; логика в stores; derived state через computed?
