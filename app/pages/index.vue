<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotesStore } from '~/stores/notes'

const notesStore = useNotesStore()
notesStore.init()

const notes = computed(() => [...notesStore.notes].sort((a, b) => b.updatedAt - a.updatedAt))

const noteIdPendingDeletion = ref<string | null>(null)
const isConfirmOpen = computed(() => noteIdPendingDeletion.value !== null)
const noteBeingDeleted = computed(() => notesStore.notes.find((note) => note.id === noteIdPendingDeletion.value))

function goToEdit(id: string): void {
  navigateTo(`/notes/${id}`)
}

function goToCreate(): void {
  navigateTo('/notes/new')
}

function requestDelete(id: string): void {
  noteIdPendingDeletion.value = id
}

function confirmDelete(): void {
  if (noteIdPendingDeletion.value) {
    notesStore.removeNote(noteIdPendingDeletion.value)
  }
  noteIdPendingDeletion.value = null
}

function cancelDelete(): void {
  noteIdPendingDeletion.value = null
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Мои заметки</h1>
      <button type="button" class="btn btn--primary" @click="goToCreate">+ Новая заметка</button>
    </header>

    <p v-if="notes.length === 0" class="page__empty">
      Заметок пока нет. Нажмите «Новая заметка», чтобы создать первую.
    </p>

    <div v-else class="notes-grid">
      <NoteCard v-for="note in notes" :key="note.id" :note="note" @edit="goToEdit" @remove="requestDelete" />
    </div>

    <ConfirmModal
      v-model="isConfirmOpen"
      title="Удалить заметку?"
      :message="`Заметка «${noteBeingDeleted?.title || 'Без названия'}» будет удалена без возможности восстановления.`"
      confirm-label="Удалить"
      cancel-label="Отмена"
      danger
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </main>
</template>

<style lang="scss" scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
  }

  &__empty {
    color: var(--color-text-muted);
    text-align: center;
    padding: 3rem 1rem;
  }
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

@media (max-width: 480px) {
  .page__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
