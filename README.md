# Notes App

SPA-приложение для заметок с todo-списками. Nuxt 4 (Composition API, TypeScript strict), Pinia, собственная вёрстка на SCSS, ручная реализация истории изменений (undo/redo) и синхронизации с localStorage.

## Стек

- **Nuxt 4** (`ssr: false`, деплой через Node-сервер Nuxt)
- **TypeScript** (strict)
- **Pinia** — стор для списка заметок и стор редактора заметки
- **SCSS** — собственная вёрстка, без UI-библиотек
- **Vitest** — unit-тесты логики истории и стора

## Запуск локально

```bash
pnpm install
pnpm dev
```

Приложение будет доступно на `http://localhost:3000`.

## Продакшн-сборка

```bash
pnpm build
node .output/server/index.mjs
```

## Docker

```bash
docker-compose up --build
```

Приложение будет доступно на `http://localhost:3000`.

## Тесты

```bash
pnpm test
```

Проверка типов (TypeScript strict, включена также при `pnpm build`):

```bash
pnpm typecheck
```

## Линтинг и форматирование

- **ESLint** (flat config, официальный модуль `@nuxt/eslint`) — линтинг TS/Vue с правилами Nuxt/Vue из коробки.
- **Prettier** — единственный источник правды по форматированию; `eslint-config-prettier` отключает конфликтующие стилистические правила ESLint, чтобы два инструмента не спорили.

```bash
pnpm lint          # проверка
pnpm lint:fix       # автофикс
pnpm format         # форматирование Prettier
pnpm format:check   # проверка форматирования без изменений
```

Покрыты unit-тестами:

- `app/utils/history.ts` — применение команд истории (`applyCommand`) и менеджер стека undo/redo (`HistoryManager`): атомарность операций, лимит в 50 шагов, очистка redo-ветки при новом изменении.
- `app/stores/notes.ts` — CRUD заметок, дебаунс записи в `localStorage`, синхронизация между вкладками через событие `storage`.
- `app/stores/noteEditor.ts` — жизненный цикл редактирования заметки: инициализация (включая `notFound`), атомарные операции над Todo, undo/redo, сохранение, отмена редактирования, восстановление/отклонение черновика.

## Архитектура

### Хранение данных

- `app/utils/storage.ts` — обёртка над `localStorage` с версией схемы (`SCHEMA_VERSION`). При несовпадении версии выполняется миграция (сейчас — заглушка, но точка расширения предусмотрена).
- Список заметок пишется в `localStorage` с дебаунсом (не на каждое изменение), см. `useNotesStore` (`app/stores/notes.ts`).
- Черновик редактируемой заметки хранится отдельно по ключу `notes-app:draft:<id>` (или `notes-app:draft:new` для новой заметки) и тоже пишется с дебаунсом + принудительно сбрасывается на `beforeunload`.

### История изменений (undo/redo)

Реализована вручную в `app/utils/history.ts`:

- `NoteCommand` — минимальный, обратимый диф (например, `{ type: 'toggleTodo', todoId, before, after }`), а не полная копия заметки — 50 шагов истории не означают 50 копий заметки.
- `HistoryManager` — стек undo/redo с лимитом 50 записей; новое изменение после undo очищает redo-ветку.
- Непрерывный ввод текста (заголовок заметки, текст пункта) коалесцируется в одну запись истории через `useCommitOnPause` (`app/composables/useCommitOnPause.ts`): фиксация происходит по паузе ввода или по `blur`, а не на каждый символ.
- Отметка чекбокса, добавление и удаление пункта — самостоятельные атомарные записи (`app/stores/noteEditor.ts`).
- История живёт в рамках сессии редактирования: очищается при `save()` и `cancelEdit()`.
- Глобальные горячие клавиши `Ctrl+Z` / `Ctrl+Shift+Z` (`app/composables/useGlobalUndoRedo.ts`) отключаются, пока фокус находится в текстовом поле — так нативный undo браузера внутри `input`/`textarea` не конфликтует с историей приложения.

### Черновики и восстановление

При открытии заметки на редактирование `useNoteEditorStore.init()` сравнивает сохранённую заметку с черновиком в `localStorage`. Если они отличаются — показывается модальное окно с предложением восстановить или отклонить черновик.

### Edge-cases

- **Несуществующая заметка по URL** — `app/pages/notes/[id].vue` показывает состояние "Заметка не найдена" со ссылкой на главную.
- **Пустые значения** — пустой заголовок заметки заменяется на «Без названия» при сохранении; пустой текст пункта допустим (не блокирует сохранение).
- **Удаление заметки в другой вкладке** — `useNotesStore` слушает событие `storage` и синхронизирует список; страница редактирования отслеживает исчезновение текущей заметки и показывает уведомление вместо падения приложения.

### Модальные окна

`app/components/BaseModal.vue` реализует focus-trap, закрытие по `Escape` и возврат фокуса на исходный элемент — без сторонних библиотек. `ConfirmModal.vue` — переиспользуемая обёртка для всех подтверждений (нет нативных `alert`/`confirm`).

## Структура проекта

```
app/
  assets/styles/     — глобальные SCSS-стили и переменные
  components/        — переиспользуемые компоненты (BaseModal, ConfirmModal, TodoItem, TodoList, NoteCard)
  composables/        — useFocusTrap, useCommitOnPause, useGlobalUndoRedo
  pages/              — index.vue (список), notes/[id].vue (создание/редактирование)
  stores/             — notes.ts, noteEditor.ts (Pinia)
  types/              — типы Note/TodoItem
  utils/              — history.ts, storage.ts, debounce.ts, id.ts
tests/                — unit-тесты (Vitest)
```
