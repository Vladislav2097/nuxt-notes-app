<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }>(),
  {
    title: 'Подтверждение',
    message: '',
    confirmLabel: 'Подтвердить',
    cancelLabel: 'Отмена',
    danger: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function handleConfirm(): void {
  emit('update:modelValue', false)
  emit('confirm')
}

function handleCancel(): void {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<template>
  <BaseModal :model-value="modelValue" :title="title" @update:model-value="handleCancel">
    <p class="confirm-message">{{ message }}</p>
    <template #footer>
      <button type="button" class="btn btn--ghost" @click="handleCancel">{{ cancelLabel }}</button>
      <button type="button" class="btn" :class="danger ? 'btn--danger' : 'btn--primary'" @click="handleConfirm">
        {{ confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
.confirm-message {
  margin: 0;
  color: var(--color-text);
  line-height: 1.5;
}
</style>
