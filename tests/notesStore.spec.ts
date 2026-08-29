import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '~/stores/notes'
import { NOTES_STORAGE_KEY } from '~/utils/storage'

describe('useNotesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads an empty list when localStorage is empty', () => {
    const store = useNotesStore()
    store.init()
    expect(store.notes).toEqual([])
  })

  it('loads existing notes from localStorage on init', () => {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        notes: [{ id: '1', title: 'Existing', todos: [], createdAt: 1, updatedAt: 1 }]
      })
    )
    const store = useNotesStore()
    store.init()
    expect(store.notes).toHaveLength(1)
    expect(store.notes[0]?.title).toBe('Existing')
  })

  it('creates a note and persists it (debounced)', () => {
    const store = useNotesStore()
    store.init()

    const note = store.createNote('My note', [])
    expect(store.notes).toHaveLength(1)

    // Not written synchronously.
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(500)

    const persisted = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(persisted.version).toBe(1)
    expect(persisted.notes).toHaveLength(1)
    expect(persisted.notes[0].id).toBe(note.id)
  })

  it('coalesces multiple rapid mutations into a single write', () => {
    const store = useNotesStore()
    store.init()

    store.createNote('A')
    vi.advanceTimersByTime(100)
    store.createNote('B')
    vi.advanceTimersByTime(100)
    store.createNote('C')
    vi.advanceTimersByTime(500)

    const persisted = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(persisted.notes).toHaveLength(3)
  })

  it('upserts an existing note by id', () => {
    const store = useNotesStore()
    store.init()
    const note = store.createNote('Original')

    store.upsertNote({ ...note, title: 'Updated' })

    expect(store.notes).toHaveLength(1)
    expect(store.notes[0]?.title).toBe('Updated')
  })

  it('removes a note by id', () => {
    const store = useNotesStore()
    store.init()
    const note = store.createNote('To be removed')

    store.removeNote(note.id)

    expect(store.notes).toHaveLength(0)
  })

  it('syncs notes when another tab writes to storage', () => {
    const store = useNotesStore()
    store.init()

    const externalPayload = {
      version: 1,
      notes: [{ id: 'ext-1', title: 'From another tab', todos: [], createdAt: 1, updatedAt: 1 }]
    }
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(externalPayload))

    window.dispatchEvent(new StorageEvent('storage', { key: NOTES_STORAGE_KEY }))

    expect(store.notes).toHaveLength(1)
    expect(store.notes[0]?.id).toBe('ext-1')
  })

  it('ignores storage events for unrelated keys', () => {
    const store = useNotesStore()
    store.init()
    store.createNote('Mine')

    window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-key' }))

    expect(store.notes).toHaveLength(1)
  })
})
