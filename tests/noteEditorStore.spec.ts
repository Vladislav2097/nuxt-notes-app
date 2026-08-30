import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '~/stores/notes'
import { useNoteEditorStore, NEW_NOTE_ID } from '~/stores/noteEditor'
import { saveDraft } from '~/utils/storage'

describe('useNoteEditorStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes a blank note for the "new" route id', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    expect(editor.notFound).toBe(false)
    expect(editor.isNew).toBe(true)
    expect(editor.draft?.title).toBe('')
    expect(editor.draft?.todos).toEqual([])
  })

  it('flags notFound for an unknown note id', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init('does-not-exist')

    expect(editor.notFound).toBe(true)
    expect(editor.draft).toBeNull()
  })

  it('loads an existing note for editing', () => {
    const notes = useNotesStore()
    notes.init()
    const note = notes.createNote('Existing note', [{ id: 't1', text: 'Buy milk', done: false }])

    const editor = useNoteEditorStore()
    editor.init(note.id)

    expect(editor.notFound).toBe(false)
    expect(editor.isNew).toBe(false)
    expect(editor.draft?.title).toBe('Existing note')
    expect(editor.draft?.todos).toHaveLength(1)
  })

  it('commitTitle records one history entry and updates the draft', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    editor.commitTitle('New title')

    expect(editor.draft?.title).toBe('New title')
    expect(editor.canUndo).toBe(true)
    expect(editor.canRedo).toBe(false)
  })

  it('commitTitle is a no-op when the value did not change', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    editor.commitTitle('')
    expect(editor.canUndo).toBe(false)
  })

  it('undo/redo revert and reapply a title change', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    editor.commitTitle('First')
    editor.undo()
    expect(editor.draft?.title).toBe('')
    expect(editor.canRedo).toBe(true)

    editor.redo()
    expect(editor.draft?.title).toBe('First')
  })

  it('addTodo, toggleTodo, editTodoText and removeTodo are atomic and undoable', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    editor.addTodo('Task 1')
    expect(editor.draft?.todos).toHaveLength(1)
    const todoId = editor.draft!.todos[0]!.id

    editor.toggleTodo(todoId)
    expect(editor.draft?.todos[0]?.done).toBe(true)

    editor.commitTodoText(todoId, 'Task 1 updated')
    expect(editor.draft?.todos[0]?.text).toBe('Task 1 updated')

    editor.removeTodo(todoId)
    expect(editor.draft?.todos).toHaveLength(0)

    // 4 atomic operations pushed: add, toggle, edit text, remove.
    editor.undo() // undo remove
    expect(editor.draft?.todos).toHaveLength(1)
    editor.undo() // undo edit text
    expect(editor.draft?.todos[0]?.text).toBe('Task 1')
    editor.undo() // undo toggle
    expect(editor.draft?.todos[0]?.done).toBe(false)
    editor.undo() // undo add
    expect(editor.draft?.todos).toHaveLength(0)
  })

  it('a new command after undo clears the redo branch', () => {
    useNotesStore().init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    editor.commitTitle('A')
    editor.commitTitle('B')
    editor.undo()
    expect(editor.canRedo).toBe(true)

    editor.addTodo('New task')
    expect(editor.canRedo).toBe(false)
  })

  it('save persists the note to the notes store and resets history', () => {
    const notes = useNotesStore()
    notes.init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    editor.commitTitle('Saved note')
    editor.addTodo('Something')
    const saved = editor.save()

    expect(saved?.title).toBe('Saved note')
    expect(notes.notes.find((n) => n.id === saved?.id)).toBeTruthy()
    expect(editor.canUndo).toBe(false)
    expect(editor.canRedo).toBe(false)
  })

  it('defaults an empty title to a placeholder on save', () => {
    const notes = useNotesStore()
    notes.init()
    const editor = useNoteEditorStore()
    editor.init(NEW_NOTE_ID)

    const saved = editor.save()
    expect(saved?.title).toBe('Без названия')
  })

  it('cancelEdit reverts the draft to the original note', () => {
    const notes = useNotesStore()
    notes.init()
    const note = notes.createNote('Original')
    const editor = useNoteEditorStore()
    editor.init(note.id)

    editor.commitTitle('Changed')
    expect(editor.draft?.title).toBe('Changed')

    editor.cancelEdit()
    expect(editor.draft?.title).toBe('Original')
    expect(editor.canUndo).toBe(false)
  })

  it('deleteNote removes the note from the notes store', () => {
    const notes = useNotesStore()
    notes.init()
    const note = notes.createNote('To delete')
    const editor = useNoteEditorStore()
    editor.init(note.id)

    editor.deleteNote()

    expect(notes.notes.find((n) => n.id === note.id)).toBeUndefined()
  })

  it('offers to restore a persisted draft that differs from the saved note', () => {
    const notes = useNotesStore()
    notes.init()
    const note = notes.createNote('Base title', [])

    saveDraft(note.id, {
      note: { ...note, title: 'Unsaved draft title' },
      savedAt: Date.now()
    })

    const editor = useNoteEditorStore()
    editor.init(note.id)

    expect(editor.draftRestoreAvailable).toBe(true)
    expect(editor.draft?.title).toBe('Base title')

    editor.restoreDraft()
    expect(editor.draft?.title).toBe('Unsaved draft title')
    expect(editor.draftRestoreAvailable).toBe(false)
  })

  it('discardDraft removes the persisted draft and keeps the saved note', () => {
    const notes = useNotesStore()
    notes.init()
    const note = notes.createNote('Base title', [])

    saveDraft(note.id, { note: { ...note, title: 'Unsaved draft title' }, savedAt: Date.now() })

    const editor = useNoteEditorStore()
    editor.init(note.id)
    editor.discardDraft()

    expect(editor.draftRestoreAvailable).toBe(false)
    expect(editor.draft?.title).toBe('Base title')
  })
})
