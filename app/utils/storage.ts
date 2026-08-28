import type { Note, NoteDraft, StoredSchema } from '~/types/note'
import { SCHEMA_VERSION } from '~/types/note'

export const NOTES_STORAGE_KEY = 'notes-app:data'
export const DRAFT_STORAGE_PREFIX = 'notes-app:draft:'

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

/**
 * Migrates an older/unknown persisted payload to the current schema.
 * Add version-specific migration steps here as the schema evolves.
 */
function migrate(parsed: Partial<StoredSchema>): Note[] {
  if (Array.isArray(parsed.notes)) {
    return parsed.notes as Note[]
  }
  return []
}

export function loadNotes(): Note[] {
  if (!hasLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredSchema>
    if (parsed.version !== SCHEMA_VERSION) {
      return migrate(parsed)
    }
    return Array.isArray(parsed.notes) ? parsed.notes : []
  } catch {
    return []
  }
}

export function saveNotes(notes: Note[]): void {
  if (!hasLocalStorage()) return
  const payload: StoredSchema = { version: SCHEMA_VERSION, notes }
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // storage might be full or unavailable (private mode) - fail silently
  }
}

function draftKey(noteId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${noteId}`
}

export function loadDraft(noteId: string): NoteDraft | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(draftKey(noteId))
    if (!raw) return null
    return JSON.parse(raw) as NoteDraft
  } catch {
    return null
  }
}

export function saveDraft(noteId: string, draft: NoteDraft): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.setItem(draftKey(noteId), JSON.stringify(draft))
  } catch {
    // ignore
  }
}

export function removeDraft(noteId: string): void {
  if (!hasLocalStorage()) return
  window.localStorage.removeItem(draftKey(noteId))
}
