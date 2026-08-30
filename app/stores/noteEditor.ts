import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Note, TodoItem } from '~/types/note'
import { generateId } from '~/utils/id'
import { debounce } from '~/utils/debounce'
import { HistoryManager, applyCommand } from '~/utils/history'
import { loadDraft, saveDraft, removeDraft } from '~/utils/storage'
import { useNotesStore } from '~/stores/notes'

const DRAFT_PERSIST_DELAY = 600
export const NEW_NOTE_ID = 'new'

function cloneNote(note: Note): Note {
  return { ...note, todos: note.todos.map((todo) => ({ ...todo })) }
}

function createBlankNote(): Note {
  const now = Date.now()
  return { id: generateId(), title: '', todos: [], createdAt: now, updatedAt: now }
}

export const useNoteEditorStore = defineStore('noteEditor', () => {
  const notesStore = useNotesStore()

  const routeId = ref<string | null>(null)
  const isNew = ref(false)
  const notFound = ref(false)
  const draft = ref<Note | null>(null)
  const originalNote = ref<Note | null>(null)
  const draftRestoreAvailable = ref(false)
  const pendingDraftNote = ref<Note | null>(null)

  // Reactive mirrors of the (non-reactive) HistoryManager, refreshed after every mutation.
  const history = new HistoryManager()
  const canUndo = ref(false)
  const canRedo = ref(false)

  function syncHistoryFlags(): void {
    canUndo.value = history.canUndo
    canRedo.value = history.canRedo
  }

  function persistDraftNow(): void {
    if (!routeId.value || !draft.value) return
    saveDraft(routeId.value, { note: draft.value, savedAt: Date.now() })
  }

  const scheduleDraftPersist = debounce(persistDraftNow, DRAFT_PERSIST_DELAY)

  function flushDraftPersist(): void {
    scheduleDraftPersist.flush()
  }

  /** Initializes the editor for a given route param: a note id, or 'new'. */
  function init(id: string): void {
    history.clear()
    syncHistoryFlags()
    draftRestoreAvailable.value = false
    pendingDraftNote.value = null
    notFound.value = false
    routeId.value = id

    let base: Note
    if (id === NEW_NOTE_ID) {
      isNew.value = true
      base = createBlankNote()
    } else {
      isNew.value = false
      const existing = notesStore.getById(id)
      if (!existing) {
        notFound.value = true
        draft.value = null
        originalNote.value = null
        return
      }
      base = cloneNote(existing)
    }

    originalNote.value = cloneNote(base)

    const persistedDraft = loadDraft(id)
    if (persistedDraft && JSON.stringify(persistedDraft.note) !== JSON.stringify(base)) {
      pendingDraftNote.value = persistedDraft.note
      draftRestoreAvailable.value = true
      draft.value = base
    } else {
      draft.value = base
    }
  }

  function restoreDraft(): void {
    if (!pendingDraftNote.value) return
    draft.value = cloneNote(pendingDraftNote.value)
    draftRestoreAvailable.value = false
    pendingDraftNote.value = null
    history.clear()
    syncHistoryFlags()
  }

  function discardDraft(): void {
    if (routeId.value) removeDraft(routeId.value)
    draftRestoreAvailable.value = false
    pendingDraftNote.value = null
  }

  function commitTitle(newTitle: string): void {
    if (!draft.value) return
    const before = draft.value.title
    if (before === newTitle) return
    draft.value = { ...draft.value, title: newTitle }
    history.push({ type: 'setTitle', before, after: newTitle })
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  function addTodo(text: string): void {
    if (!draft.value) return
    const todo: TodoItem = { id: generateId(), text, done: false }
    const index = draft.value.todos.length
    draft.value = { ...draft.value, todos: [...draft.value.todos, todo] }
    history.push({ type: 'addTodo', todo, index })
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  function removeTodo(todoId: string): void {
    if (!draft.value) return
    const index = draft.value.todos.findIndex((todo) => todo.id === todoId)
    if (index === -1) return
    const todo = draft.value.todos[index]!
    draft.value = { ...draft.value, todos: draft.value.todos.filter((t) => t.id !== todoId) }
    history.push({ type: 'removeTodo', todo, index })
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  function toggleTodo(todoId: string): void {
    if (!draft.value) return
    const todo = draft.value.todos.find((t) => t.id === todoId)
    if (!todo) return
    const before = todo.done
    const after = !before
    draft.value = {
      ...draft.value,
      todos: draft.value.todos.map((t) => (t.id === todoId ? { ...t, done: after } : t))
    }
    history.push({ type: 'toggleTodo', todoId, before, after })
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  function commitTodoText(todoId: string, newText: string): void {
    if (!draft.value) return
    const todo = draft.value.todos.find((t) => t.id === todoId)
    if (!todo) return
    const before = todo.text
    if (before === newText) return
    draft.value = {
      ...draft.value,
      todos: draft.value.todos.map((t) => (t.id === todoId ? { ...t, text: newText } : t))
    }
    history.push({ type: 'editTodoText', todoId, before, after: newText })
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  function undo(): void {
    if (!draft.value) return
    const command = history.undo()
    if (!command) return
    draft.value = applyCommand(draft.value, command, 'undo')
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  function redo(): void {
    if (!draft.value) return
    const command = history.redo()
    if (!command) return
    draft.value = applyCommand(draft.value, command, 'redo')
    syncHistoryFlags()
    scheduleDraftPersist()
  }

  /** Persists the draft as the real note, clears history/draft storage. */
  function save(): Note | null {
    if (!draft.value) return null
    scheduleDraftPersist.cancel()
    const title = draft.value.title.trim() || 'Без названия'
    const finalNote: Note = { ...draft.value, title }
    notesStore.upsertNote(finalNote)
    if (routeId.value) removeDraft(routeId.value)
    history.clear()
    syncHistoryFlags()
    originalNote.value = cloneNote(finalNote)
    draft.value = cloneNote(finalNote)
    return finalNote
  }

  /** Discards in-progress edits and resets history/draft storage. */
  function cancelEdit(): void {
    scheduleDraftPersist.cancel()
    if (routeId.value) removeDraft(routeId.value)
    history.clear()
    syncHistoryFlags()
    if (originalNote.value) {
      draft.value = cloneNote(originalNote.value)
    }
  }

  function deleteNote(): void {
    if (!routeId.value) return
    scheduleDraftPersist.cancel()
    if (!isNew.value) {
      notesStore.removeNote(routeId.value)
    }
    removeDraft(routeId.value)
    history.clear()
    syncHistoryFlags()
  }

  const isDirty = computed(() => {
    if (!draft.value || !originalNote.value) return false
    return JSON.stringify(draft.value) !== JSON.stringify(originalNote.value)
  })

  return {
    routeId,
    isNew,
    notFound,
    draft,
    originalNote,
    draftRestoreAvailable,
    canUndo,
    canRedo,
    isDirty,
    init,
    restoreDraft,
    discardDraft,
    commitTitle,
    addTodo,
    removeTodo,
    toggleTodo,
    commitTodoText,
    undo,
    redo,
    save,
    cancelEdit,
    deleteNote,
    flushDraftPersist
  }
})
