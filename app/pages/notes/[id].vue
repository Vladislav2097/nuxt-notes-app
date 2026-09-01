<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNotesStore } from '~/stores/notes'
import { useNoteEditorStore } from '~/stores/noteEditor'
import { useCommitOnPause } from '~/composables/useCommitOnPause'
import { useGlobalUndoRedo } from '~/composables/useGlobalUndoRedo'

const route = useRoute()
const noteId = computed(() => String(route.params.id))

const notesStore = useNotesStore()
notesStore.init()

const editor = useNoteEditorStore()
editor.init(noteId.value)

watch(noteId, (id) => {
  editor.init(id)
})

const leavingIntentionally = ref(false)
const noteDeletedRemotely = ref(false)

watch(
  () => notesStore.notes,
  () => {
    if (editor.isNew || leavingIntentionally.value || editor.notFound) return
    if (!notesStore.getById(noteId.value)) {
      noteDeletedRemotely.value = true
    }
  },
  { deep: false }
)

const localTitle = ref(editor.draft?.title ?? '')
watch(
  () => editor.draft?.title,
  (title) => {
    if (title !== undefined && title !== localTitle.value) localTitle.value = title
  }
)

const {
  onInput: onTitleInput,
  onBlur: onTitleBlur,
  flush: flushTitle
} = useCommitOnPause((value) => {
  editor.commitTitle(value)
}, 800)

function handleTitleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  localTitle.value = value
  onTitleInput(value)
}

function handleTitleBlur(): void {
  onTitleBlur(localTitle.value)
}

useGlobalUndoRedo(
  () => editor.undo(),
  () => editor.redo()
)

function handleBeforeUnload(): void {
  flushTitle()
  editor.flushDraftPersist()
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  handleBeforeUnload()
})

const isCancelConfirmOpen = ref(false)
const isDeleteConfirmOpen = ref(false)

async function handleSave(): Promise<void> {
  flushTitle()
  leavingIntentionally.value = true
  editor.save()
  await navigateTo('/')
}

function requestCancel(): void {
  isCancelConfirmOpen.value = true
}

async function confirmCancel(): Promise<void> {
  leavingIntentionally.value = true
  editor.cancelEdit()
  await navigateTo('/')
}

function requestDelete(): void {
  isDeleteConfirmOpen.value = true
}

async function confirmDeleteNote(): Promise<void> {
  leavingIntentionally.value = true
  editor.deleteNote()
  await navigateTo('/')
}

async function acknowledgeRemoteDeletion(): Promise<void> {
  leavingIntentionally.value = true
  await navigateTo('/')
}
</script>

<template>
  <main class="page">
    <NuxtLink to="/" class="page__back">← К списку заметок</NuxtLink>

    <div v-if="editor.notFound" class="page__notfound">
      <h1>Заметка не найдена</h1>
      <p>Возможно, она была удалена. Проверьте адрес или вернитесь к списку заметок.</p>
      <NuxtLink to="/" class="btn btn--primary">На главную</NuxtLink>
    </div>

    <template v-else-if="editor.draft">
      <header class="page__header">
        <input
          class="title-input"
          type="text"
          :value="localTitle"
          placeholder="Название заметки"
          aria-label="Название заметки"
          :disabled="noteDeletedRemotely"
          @input="handleTitleInput"
          @blur="handleTitleBlur"
        />

        <div class="history-controls">
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            title="Отменить (Ctrl+Z)"
            :disabled="!editor.canUndo || noteDeletedRemotely"
            @click="editor.undo()"
          >
            ↶ Отменить
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            title="Повторить (Ctrl+Shift+Z)"
            :disabled="!editor.canRedo || noteDeletedRemotely"
            @click="editor.redo()"
          >
            ↷ Повторить
          </button>
        </div>
      </header>

      <section class="page__todos">
        <TodoList
          :todos="editor.draft.todos"
          @toggle="editor.toggleTodo"
          @remove="editor.removeTodo"
          @commit-text="(id, value) => editor.commitTodoText(id, value)"
          @add="editor.addTodo"
        />
      </section>

      <footer class="page__actions">
        <button type="button" class="btn btn--danger-ghost" :disabled="noteDeletedRemotely" @click="requestDelete">
          Удалить
        </button>
        <div class="page__actions-right">
          <button type="button" class="btn btn--ghost" @click="requestCancel">Отменить редактирование</button>
          <button type="button" class="btn btn--primary" :disabled="noteDeletedRemotely" @click="handleSave">
            Сохранить
          </button>
        </div>
      </footer>
    </template>

    <ConfirmModal
      v-model="editor.draftRestoreAvailable"
      title="Найден несохранённый черновик"
      message="Обнаружены несохранённые изменения этой заметки с прошлой сессии. Восстановить их?"
      confirm-label="Восстановить"
      cancel-label="Отклонить"
      @confirm="editor.restoreDraft()"
      @cancel="editor.discardDraft()"
    />

    <ConfirmModal
      v-model="isCancelConfirmOpen"
      title="Отменить редактирование?"
      message="Все несохранённые изменения будут потеряны."
      confirm-label="Отменить изменения"
      cancel-label="Продолжить редактирование"
      danger
      @confirm="confirmCancel"
    />

    <ConfirmModal
      v-model="isDeleteConfirmOpen"
      title="Удалить заметку?"
      message="Это действие необратимо."
      confirm-label="Удалить"
      cancel-label="Отмена"
      danger
      @confirm="confirmDeleteNote"
    />

    <ConfirmModal
      :model-value="noteDeletedRemotely"
      title="Заметка удалена"
      message="Эта заметка была удалена в другой вкладке. Ваши изменения не будут сохранены."
      confirm-label="На главную"
      cancel-label="На главную"
      @confirm="acknowledgeRemoteDeletion"
      @cancel="acknowledgeRemoteDeletion"
    />
  </main>
</template>

<style lang="scss" scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;

  &__back {
    display: inline-block;
    margin-bottom: 1rem;
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: 0.9rem;

    &:hover {
      color: var(--color-primary);
    }
  }

  &__notfound {
    text-align: center;
    padding: 3rem 1rem;

    p {
      color: var(--color-text-muted);
      margin-bottom: 1.25rem;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }

  &__todos {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    margin-bottom: 1.5rem;
  }

  &__actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__actions-right {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
}

.title-input {
  flex: 1;
  min-width: 200px;
  font-size: 1.3rem;
  font-weight: 600;
  border: none;
  background: transparent;
  padding: 0.4rem 0.2rem;
  border-radius: var(--radius-sm);
  color: var(--color-text);

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    background: var(--color-surface);
  }
}

.history-controls {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .page__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .page__actions-right {
    justify-content: stretch;

    .btn {
      flex: 1;
    }
  }
}
</style>
