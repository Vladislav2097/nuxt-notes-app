<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFocusTrap } from '~/composables/useFocusTrap'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
  }>(),
  { title: '' }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialogRef = ref<HTMLElement | null>(null)
const isOpen = computed(() => props.modelValue)

function close(): void {
  emit('update:modelValue', false)
}

useFocusTrap(dialogRef, isOpen, close)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @mousedown.self="close">
        <div
          ref="dialogRef"
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-label="title || undefined"
          tabindex="-1"
        >
          <header v-if="title" class="modal__header">
            <h2 class="modal__title">{{ title }}</h2>
            <button type="button" class="modal__close" aria-label="Закрыть" @click="close">✕</button>
          </header>
          <div class="modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 25, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  outline: none;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-text-muted);
    line-height: 1;
    padding: 0.25rem 0.4rem;
    border-radius: var(--radius-sm);

    &:hover,
    &:focus-visible {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
  }

  &__body {
    padding: 1.1rem 1.25rem;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.75rem 1.25rem 1.1rem;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
