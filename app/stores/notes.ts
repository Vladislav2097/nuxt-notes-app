import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Note } from '~/types/note'
import { generateId } from '~/utils/id'
import { debounce } from '~/utils/debounce'
import { loadNotes, saveNotes, NOTES_STORAGE_KEY } from '~/utils/storage'

const PERSIST_DELAY = 400

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const loaded = ref(false)

  const getById = computed(
    () =>
      (id: string): Note | undefined =>
        notes.value.find((note) => note.id === id)
  )

  function persistNow(): void {
    saveNotes(notes.value)
  }

  const schedulePersist = debounce(persistNow, PERSIST_DELAY)

  function handleStorageEvent(event: StorageEvent): void {
    if (event.key !== NOTES_STORAGE_KEY) return
    // Another tab changed the notes list (e.g. deleted a note we might be
    // editing). Re-sync our in-memory copy so consumers (e.g. the editor
    // page) can react to notes disappearing.
    notes.value = loadNotes()
  }

  /** Loads notes from localStorage and sets up cross-tab sync. Idempotent. */
  function init(): void {
    if (loaded.value) return
    notes.value = loadNotes()
    loaded.value = true

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent)
    }
  }

  function createNote(title = '', todos: Note['todos'] = []): Note {
    const now = Date.now()
    const note: Note = {
      id: generateId(),
      title,
      todos,
      createdAt: now,
      updatedAt: now
    }
    notes.value.push(note)
    schedulePersist()
    return note
  }

  function upsertNote(note: Note): void {
    const index = notes.value.findIndex((n) => n.id === note.id)
    const updated: Note = { ...note, updatedAt: Date.now() }
    if (index === -1) {
      notes.value.push(updated)
    } else {
      notes.value.splice(index, 1, updated)
    }
    schedulePersist()
  }

  function removeNote(id: string): void {
    notes.value = notes.value.filter((note) => note.id !== id)
    schedulePersist()
  }

  return {
    notes,
    loaded,
    getById,
    init,
    persistNow,
    createNote,
    upsertNote,
    removeNote
  }
})
