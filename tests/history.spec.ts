import { describe, expect, it } from 'vitest'
import { HistoryManager, HISTORY_LIMIT, applyCommand, type NoteCommand } from '~/utils/history'
import type { Note } from '~/types/note'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Title',
    todos: [
      { id: 'todo-1', text: 'First', done: false },
      { id: 'todo-2', text: 'Second', done: true }
    ],
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

describe('applyCommand', () => {
  it('applies and undoes setTitle', () => {
    const note = makeNote()
    const command: NoteCommand = { type: 'setTitle', before: 'Title', after: 'New Title' }

    const redone = applyCommand(note, command, 'redo')
    expect(redone.title).toBe('New Title')
    expect(note.title).toBe('Title') // original untouched (immutability)

    const undone = applyCommand(redone, command, 'undo')
    expect(undone.title).toBe('Title')
  })

  it('applies and undoes toggleTodo', () => {
    const note = makeNote()
    const command: NoteCommand = { type: 'toggleTodo', todoId: 'todo-1', before: false, after: true }

    const redone = applyCommand(note, command, 'redo')
    expect(redone.todos.find((t) => t.id === 'todo-1')?.done).toBe(true)

    const undone = applyCommand(redone, command, 'undo')
    expect(undone.todos.find((t) => t.id === 'todo-1')?.done).toBe(false)
  })

  it('applies and undoes editTodoText', () => {
    const note = makeNote()
    const command: NoteCommand = { type: 'editTodoText', todoId: 'todo-1', before: 'First', after: 'Updated' }

    const redone = applyCommand(note, command, 'redo')
    expect(redone.todos.find((t) => t.id === 'todo-1')?.text).toBe('Updated')

    const undone = applyCommand(redone, command, 'undo')
    expect(undone.todos.find((t) => t.id === 'todo-1')?.text).toBe('First')
  })

  it('applies and undoes addTodo at the correct index', () => {
    const note = makeNote()
    const newTodo = { id: 'todo-3', text: 'Third', done: false }
    const command: NoteCommand = { type: 'addTodo', todo: newTodo, index: 2 }

    const redone = applyCommand(note, command, 'redo')
    expect(redone.todos).toHaveLength(3)
    expect(redone.todos[2]).toEqual(newTodo)

    const undone = applyCommand(redone, command, 'undo')
    expect(undone.todos).toHaveLength(2)
    expect(undone.todos.find((t) => t.id === 'todo-3')).toBeUndefined()
  })

  it('applies and undoes removeTodo, restoring original position', () => {
    const note = makeNote()
    const removed = note.todos[0]!
    const command: NoteCommand = { type: 'removeTodo', todo: removed, index: 0 }

    const redone = applyCommand(note, command, 'redo')
    expect(redone.todos).toHaveLength(1)
    expect(redone.todos[0]!.id).toBe('todo-2')

    const undone = applyCommand(redone, command, 'undo')
    expect(undone.todos).toHaveLength(2)
    expect(undone.todos[0]!.id).toBe('todo-1')
    expect(undone.todos[1]!.id).toBe('todo-2')
  })
})

describe('HistoryManager', () => {
  it('starts empty', () => {
    const history = new HistoryManager()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })

  it('pushes commands onto the undo stack', () => {
    const history = new HistoryManager()
    history.push({ type: 'setTitle', before: 'a', after: 'b' })
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('undo moves a command to the redo stack', () => {
    const history = new HistoryManager()
    const command: NoteCommand = { type: 'setTitle', before: 'a', after: 'b' }
    history.push(command)

    const undone = history.undo()
    expect(undone).toEqual(command)
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)
  })

  it('redo moves a command back to the undo stack', () => {
    const history = new HistoryManager()
    const command: NoteCommand = { type: 'setTitle', before: 'a', after: 'b' }
    history.push(command)
    history.undo()

    const redone = history.redo()
    expect(redone).toEqual(command)
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('undo/redo on empty stacks return undefined and do not throw', () => {
    const history = new HistoryManager()
    expect(history.undo()).toBeUndefined()
    expect(history.redo()).toBeUndefined()
  })

  it('pushing a new command after undo clears the redo branch', () => {
    const history = new HistoryManager()
    history.push({ type: 'setTitle', before: 'a', after: 'b' })
    history.push({ type: 'setTitle', before: 'b', after: 'c' })
    history.undo()
    expect(history.canRedo).toBe(true)

    history.push({ type: 'setTitle', before: 'b', after: 'd' })
    expect(history.canRedo).toBe(false)
  })

  it('caps the undo stack at the configured limit, dropping the oldest entries', () => {
    const limit = 5
    const history = new HistoryManager(limit)
    for (let i = 0; i < limit + 3; i++) {
      history.push({ type: 'setTitle', before: String(i), after: String(i + 1) })
    }
    expect(history.undoCount).toBe(limit)

    // The oldest surviving entry should be the 4th pushed one (index 3),
    // since the first 3 were evicted.
    const firstUndo = history.undo()
    expect(firstUndo).toEqual({ type: 'setTitle', before: '7', after: '8' })
  })

  it('defaults to the documented HISTORY_LIMIT', () => {
    const history = new HistoryManager()
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      history.push({ type: 'setTitle', before: String(i), after: String(i + 1) })
    }
    expect(history.undoCount).toBe(HISTORY_LIMIT)
  })

  it('clear resets both stacks', () => {
    const history = new HistoryManager()
    history.push({ type: 'setTitle', before: 'a', after: 'b' })
    history.undo()
    history.clear()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})
