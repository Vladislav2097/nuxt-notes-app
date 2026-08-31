<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '~/types/note'

const MAX_PREVIEW_TODOS = 5

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  edit: [id: string]
  remove: [id: string]
}>()

const previewTodos = computed(() => props.note.todos.slice(0, MAX_PREVIEW_TODOS))
const remainingCount = computed(() => Math.max(0, props.note.todos.length - MAX_PREVIEW_TODOS))
const doneCount = computed(() => props.note.todos.filter((todo) => todo.done).length)
</script>

<template>
  <article class="note-card">
    <button type="button" class="note-card__body" @click="emit('edit', note.id)">
      <h3 class="note-card__title">{{ note.title || 'Без названия' }}</h3>

      <p v-if="note.todos.length" class="note-card__progress">{{ doneCount }} / {{ note.todos.length }} выполнено</p>

      <ul v-if="previewTodos.length" class="note-card__todos">
        <li
          v-for="todo in previewTodos"
          :key="todo.id"
          class="note-card__todo"
          :class="{ 'note-card__todo--done': todo.done }"
        >
          <span class="note-card__todo-mark" aria-hidden="true">{{ todo.done ? '✓' : '' }}</span>
          <span class="note-card__todo-text">{{ todo.text || '(пусто)' }}</span>
        </li>
      </ul>
      <p v-else class="note-card__empty">Нет пунктов</p>

      <p v-if="remainingCount > 0" class="note-card__more">+{{ remainingCount }} ещё</p>
    </button>

    <div class="note-card__actions">
      <button type="button" class="btn btn--ghost btn--sm" @click="emit('edit', note.id)">Изменить</button>
      <button type="button" class="btn btn--danger-ghost btn--sm" @click="emit('remove', note.id)">Удалить</button>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.note-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    border-color: var(--color-border-strong);
  }

  &__body {
    display: block;
    text-align: left;
    background: none;
    border: none;
    padding: 1rem 1.1rem 0.5rem;
    cursor: pointer;
    color: inherit;
    font: inherit;
    width: 100%;

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
  }

  &__title {
    margin: 0 0 0.35rem;
    font-size: 1.05rem;
    font-weight: 600;
    word-break: break-word;
  }

  &__progress {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__todos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__todo {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__todo-mark {
    flex-shrink: 0;
    width: 1rem;
    color: var(--color-primary);
    font-weight: 700;
  }

  &__todo--done &__todo-text {
    color: var(--color-text-muted);
    text-decoration: line-through;
  }

  &__todo-text {
    word-break: break-word;
  }

  &__empty,
  &__more {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.6rem 1.1rem 1rem;
    margin-top: auto;
  }
}
</style>
