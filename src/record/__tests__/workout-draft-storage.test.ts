import { describe, expect, it } from "vitest"

import {
  WORKOUT_DRAFT_STORAGE_KEY,
  makeWorkoutDraft,
  parseWorkoutDraft,
  readWorkoutDraft,
  writeWorkoutDraft,
} from "../workout-draft-storage"

const editor = {
  date: "2026-08-18",
  name: "Push",
  notes: "note",
  rows: [
    {
      key: "row-1",
      variantId: "push-up",
      variantName: "Push-up",
      categoryName: "Push",
      notes: "slow",
      initialCue: { workoutDate: "2026-08-17", reps: [8, 6] },
      sets: [{ key: "set-1", reps: "9" }],
    },
  ],
}

describe("workout draft storage", () => {
  it("round-trips a versioned draft including editor structure and cues", () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    const draft = makeWorkoutDraft("request-1", "repeat", editor)
    expect(writeWorkoutDraft(storage, draft)).toBe(true)
    expect(readWorkoutDraft(storage)).toMatchObject({ kind: "draft", draft })
  })

  it("rejects unsupported versions and safely removes corrupt payloads", () => {
    const removed: string[] = []
    const storage = {
      getItem: () => "{bad json",
      setItem: () => {},
      removeItem: (key: string) => removed.push(key),
    }
    expect(readWorkoutDraft(storage)).toEqual({ kind: "invalid" })
    expect(removed).toEqual([WORKOUT_DRAFT_STORAGE_KEY])
    expect(parseWorkoutDraft({ version: 99 })).toBeNull()
  })

  it("does not throw when storage is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("quota")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    }
    expect(readWorkoutDraft(storage)).toEqual({ kind: "unavailable" })
    expect(
      writeWorkoutDraft(storage, makeWorkoutDraft("id", "blank", editor))
    ).toBe(false)
  })
})
