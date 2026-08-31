<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TodoItem } from '~/types/note'
import { useCommitOnPause } from '~/composables/useCommitOnPause'

const props = defineProps<{
  todo: TodoItem
}>()

const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  commitText: [id: string, value: string]
}>()

const localText = ref(props.todo.text)

watch(
  () => props.todo.text,
  (value) => {
    if (value !== localText.value) localText.value = value
  }
)

const { onInput, onBlur, flush } = useCommitOnPause((value) => {
  emit('commitText', props.todo.id, value)
}, 700)

function handleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  localText.value = value
  onInput(value)
}

function handleBlur(): void {
  onBlur(localText.value)
}

defineExpose({ flush })
</script>

<template>
  <li class="todo-item" :class="{ 'todo-item--done': todo.done }">
    <label class="todo-item__checkbox-wrap">
      <input
        type="checkbox"
        class="todo-item__checkbox"
        :checked="todo.done"
        :aria-label="todo.done ? 'Отметить как невыполненное' : 'Отметить как выполненное'"
        @change="emit('toggle', todo.id)"
      />
      <span class="todo-item__checkbox-visual" aria-hidden="true"></span>
    </label>

    <input
      type="text"
      class="todo-item__text"
      :value="localText"
      placeholder="Текст пункта"
      aria-label="Текст пункта задачи"
      @input="handleInput"
      @blur="handleBlur"
    />

    <button
      type="button"
      class="todo-item__remove"
      aria-label="Удалить пункт"
      title="Удалить пункт"
      @click="emit('remove', todo.id)"
    >
      ✕
    </button>
  </li>
</template>

<style lang="scss" scoped>
.todo-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.25rem;
  border-radius: var(--radius-sm);

  &:hover {
    background: var(--color-surface-hover);
  }

  &--done .todo-item__text {
    color: var(--color-text-muted);
    text-decoration: line-through;
  }

  &__checkbox-wrap {
    position: relative;
    display: inline-flex;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__checkbox {
    position: absolute;
    opacity: 0;
    width: 20px;
    height: 20px;
    margin: 0;
    cursor: pointer;

    &:focus-visible + .todo-item__checkbox-visual {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &:checked + .todo-item__checkbox-visual {
      background: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        opacity: 1;
      }
    }
  }

  &__checkbox-visual {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 2px solid var(--color-border-strong);
    display: inline-block;
    position: relative;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;

    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 1px;
      width: 6px;
      height: 11px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      opacity: 0;
    }
  }

  &__text {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    color: var(--color-text);
    padding: 0.3rem 0.2rem;
    border-radius: var(--radius-sm);

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      background: var(--color-surface);
    }
  }

  &__remove {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.3rem 0.45rem;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;

    &:hover,
    &:focus-visible {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }
  }
}
</style>
