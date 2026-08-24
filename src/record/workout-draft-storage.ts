import type { Editor } from "./workout-editor"

export const WORKOUT_DRAFT_STORAGE_KEY = "form.workout-draft"
const VERSION = 1
export type WorkoutDraftOrigin = "blank" | "template" | "repeat"
export type WorkoutDraft = {
  version: typeof VERSION
  requestId: string
  savedAt: number
  origin: WorkoutDraftOrigin
  editor: Editor
}
export type DraftReadResult =
  | { kind: "empty" }
  | { kind: "draft"; draft: WorkoutDraft }
  | { kind: "invalid" }
  | { kind: "unavailable" }

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

function isString(value: unknown): value is string {
  return typeof value === "string"
}
function isCue(
  value: unknown
): value is { workoutDate: string; reps: number[] } {
  return Boolean(
    value &&
    typeof value === "object" &&
    isString((value as { workoutDate?: unknown }).workoutDate) &&
    Array.isArray((value as { reps?: unknown }).reps) &&
    (value as { reps: unknown[] }).reps.every(
      (rep) => typeof rep === "number" && Number.isSafeInteger(rep)
    )
  )
}

/** Validates all persisted fields before they are allowed back into the UI. */
export function parseWorkoutDraft(value: unknown): WorkoutDraft | null {
  if (!value || typeof value !== "object") return null
  const draft = value as Record<string, unknown>
  if (
    draft.version !== VERSION ||
    !isString(draft.requestId) ||
    !draft.requestId ||
    typeof draft.savedAt !== "number" ||
    !Number.isFinite(draft.savedAt) ||
    !["blank", "template", "repeat"].includes(String(draft.origin)) ||
    !draft.editor ||
    typeof draft.editor !== "object"
  )
    return null
  const editor = draft.editor as Record<string, unknown>
  if (
    !isString(editor.date) ||
    !isString(editor.name) ||
    !isString(editor.notes) ||
    !Array.isArray(editor.rows) ||
    (editor.templateId !== undefined && !isString(editor.templateId))
  )
    return null
  const rows = editor.rows.map((raw) => {
    if (!raw || typeof raw !== "object") return null
    const row = raw as Record<string, unknown>
    if (
      !isString(row.key) ||
      !isString(row.variantId) ||
      !isString(row.variantName) ||
      !isString(row.categoryName) ||
      !isString(row.notes) ||
      !Array.isArray(row.sets) ||
      (row.initialCue !== undefined && !isCue(row.initialCue))
    )
      return null
    const sets = row.sets.map((set) => {
      if (!set || typeof set !== "object") return null
      const item = set as Record<string, unknown>
      return isString(item.key) && isString(item.reps)
        ? { key: item.key, reps: item.reps }
        : null
    })
    if (sets.some((set) => set === null)) return null
    return {
      key: row.key,
      variantId: row.variantId,
      variantName: row.variantName,
      categoryName: row.categoryName,
      notes: row.notes,
      sets: sets as { key: string; reps: string }[],
      ...(row.initialCue === undefined
        ? {}
        : {
            initialCue: row.initialCue as {
              workoutDate: string
              reps: number[]
            },
          }),
    }
  })
  if (rows.some((row) => row === null)) return null
  return {
    version: VERSION,
    requestId: draft.requestId,
    savedAt: draft.savedAt,
    origin: draft.origin as WorkoutDraftOrigin,
    editor: {
      ...(editor.templateId === undefined
        ? {}
        : { templateId: editor.templateId }),
      date: editor.date,
      name: editor.name,
      notes: editor.notes,
      rows: rows as Editor["rows"],
    },
  }
}

export function readWorkoutDraft(storage: StorageLike): DraftReadResult {
  let raw: string | null
  try {
    raw = storage.getItem(WORKOUT_DRAFT_STORAGE_KEY)
  } catch {
    return { kind: "unavailable" }
  }
  if (!raw) return { kind: "empty" }
  try {
    const draft = parseWorkoutDraft(JSON.parse(raw))
    if (draft) return { kind: "draft", draft }
  } catch {
    // Treat malformed JSON exactly like any other invalid untrusted payload.
  }
  try {
    storage.removeItem(WORKOUT_DRAFT_STORAGE_KEY)
  } catch {
    return { kind: "unavailable" }
  }
  return { kind: "invalid" }
}

export function writeWorkoutDraft(storage: StorageLike, draft: WorkoutDraft) {
  try {
    storage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearWorkoutDraft(storage: StorageLike) {
  try {
    storage.removeItem(WORKOUT_DRAFT_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function makeWorkoutDraft(
  requestId: string,
  origin: WorkoutDraftOrigin,
  editor: Editor
): WorkoutDraft {
  return { version: VERSION, requestId, savedAt: Date.now(), origin, editor }
}
