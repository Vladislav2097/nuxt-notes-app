import type { Note, TodoItem } from '~/types/note'

/**
 * A history command describes a single atomic, invertible change to a Note.
 * We never store full copies of the Note - only the minimal diff needed
 * to apply/undo the change. This keeps the history lightweight even at
 * the 50-step limit.
 */
export type NoteCommand =
  | { type: 'setTitle'; before: string; after: string }
  | { type: 'toggleTodo'; todoId: string; before: boolean; after: boolean }
  | { type: 'editTodoText'; todoId: string; before: string; after: string }
  | { type: 'addTodo'; todo: TodoItem; index: number }
  | { type: 'removeTodo'; todo: TodoItem; index: number }

export const HISTORY_LIMIT = 50

/**
 * Applies a command to a note, in either the forward ('redo') or
 * backward ('undo') direction. Returns a new Note instance (immutable
 * update) - the input note is never mutated.
 */
export function applyCommand(note: Note, command: NoteCommand, direction: 'undo' | 'redo'): Note {
  const forward = direction === 'redo'

  switch (command.type) {
    case 'setTitle': {
      return { ...note, title: forward ? command.after : command.before }
    }
    case 'toggleTodo': {
      const value = forward ? command.after : command.before
      return {
        ...note,
        todos: note.todos.map((todo) => (todo.id === command.todoId ? { ...todo, done: value } : todo))
      }
    }
    case 'editTodoText': {
      const value = forward ? command.after : command.before
      return {
        ...note,
        todos: note.todos.map((todo) => (todo.id === command.todoId ? { ...todo, text: value } : todo))
      }
    }
    case 'addTodo': {
      if (forward) {
        const todos = [...note.todos]
        todos.splice(command.index, 0, command.todo)
        return { ...note, todos }
      }
      return { ...note, todos: note.todos.filter((todo) => todo.id !== command.todo.id) }
    }
    case 'removeTodo': {
      if (forward) {
        return { ...note, todos: note.todos.filter((todo) => todo.id !== command.todo.id) }
      }
      const todos = [...note.todos]
      todos.splice(command.index, 0, command.todo)
      return { ...note, todos }
    }
    default: {
      const exhaustive: never = command
      return exhaustive
    }
  }
}

/**
 * Manages an undo/redo stack of NoteCommand entries.
 * - Pushing a new command clears the redo branch.
 * - The stack is capped at HISTORY_LIMIT entries (oldest entries are dropped).
 * - This class holds no reference to the Note itself; the caller is
 *   responsible for applying commands via `applyCommand`.
 */
export class HistoryManager {
  private undoStack: NoteCommand[] = []
  private redoStack: NoteCommand[] = []
  private readonly limit: number

  constructor(limit: number = HISTORY_LIMIT) {
    this.limit = limit
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoCount(): number {
    return this.undoStack.length
  }

  get redoCount(): number {
    return this.redoStack.length
  }

  push(command: NoteCommand): void {
    this.undoStack.push(command)
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(): NoteCommand | undefined {
    const command = this.undoStack.pop()
    if (!command) return undefined
    this.redoStack.push(command)
    if (this.redoStack.length > this.limit) {
      this.redoStack.shift()
    }
    return command
  }

  redo(): NoteCommand | undefined {
    const command = this.redoStack.pop()
    if (!command) return undefined
    this.undoStack.push(command)
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
    return command
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
