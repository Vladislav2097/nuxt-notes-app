<script setup lang="ts">
import { ref } from 'vue'
import type { TodoItem } from '~/types/note'

defineProps<{
  todos: TodoItem[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  commitText: [id: string, value: string]
  add: [text: string]
}>()

const newTodoText = ref('')
const newTodoInput = ref<HTMLInputElement | null>(null)

function submitNewTodo(): void {
  const text = newTodoText.value.trim()
  if (!text) {
    newTodoInput.value?.focus()
    return
  }
  emit('add', text)
  newTodoText.value = ''
  newTodoInput.value?.focus()
}
</script>

<template>
  <div class="todo-list">
    <ul class="todo-list__items">
      <TodoItem
        v-for="todo in todos"
        :key="todo.id"
        :todo="todo"
        @toggle="(id) => emit('toggle', id)"
        @remove="(id) => emit('remove', id)"
        @commit-text="(id, value) => emit('commitText', id, value)"
      />
    </ul>

    <p v-if="todos.length === 0" class="todo-list__empty">Пока нет ни одного пункта</p>

    <form class="todo-list__add" @submit.prevent="submitNewTodo">
      <input
        ref="newTodoInput"
        v-model="newTodoText"
        type="text"
        class="todo-list__add-input"
        placeholder="Новый пункт..."
        aria-label="Текст нового пункта"
      />
      <button type="submit" class="btn btn--primary btn--sm">Добавить</button>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &__items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__empty {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin: 0.25rem 0;
  }

  &__add {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--color-border);
  }

  &__add-input {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      border-color: var(--color-primary);
    }
  }
}
</style>
