export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  todos: TodoItem[]
  createdAt: number
  updatedAt: number
}

export const SCHEMA_VERSION = 1 as const

export interface StoredSchema {
  version: number
  notes: Note[]
}

export interface NoteDraft {
  note: Note
  savedAt: number
}
