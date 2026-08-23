import { describe, expect, it, vi } from "vitest"

import {
  createWorkout,
  createWorkoutFromTemplate,
  parseReps,
} from "../workouts"

const variant = {
  id: "variant",
  userId: "owner",
  categoryId: "category",
  name: "Ring row",
  difficultyMultiplier: 1250,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: "category", name: "Pull", archivedAt: null },
}

function database() {
  const inserted: unknown[] = []
  const batch = vi.fn().mockResolvedValue([])
  const findMany = vi.fn().mockResolvedValue([variant])
  const db = {
    batch,
    insert: vi.fn(() => ({
      values: vi.fn((value) => {
        inserted.push(value)
        return value
      }),
    })),
    query: {
      exerciseVariants: { findMany },
    },
  } as never
  return { db, batch, findMany, inserted }
}

describe("workout operations", () => {
  it("accepts only positive whole-number reps", () => {
    expect(parseReps(" 12 ")).toEqual({ value: 12 })
    for (const value of [undefined, "", 0, -2, 1.5, "1.5", "1e2"]) {
      expect(parseReps(value)).toEqual({
        error: "Enter a positive whole number of reps.",
      })
    }
  })

  it("snapshots ordered repeated exercises and sets in one batch", async () => {
    const { db, batch, inserted } = database()
    const result = await createWorkout(db, "owner", {
      workoutDate: "2030-02-03",
      name: " Pull ",
      notes: " Strong session ",
      exercises: [
        { variantId: "variant", notes: "Slow", sets: [8, "7"] },
        { variantId: "variant", sets: [6] },
      ],
    })

    expect(result).toMatchObject({
      ok: true,
      value: { name: "Pull", notes: "Strong session" },
    })
    expect(batch).toHaveBeenCalledOnce()
    expect(inserted[1]).toEqual([
      expect.objectContaining({
        position: 0,
        categoryName: "Pull",
        variantName: "Ring row",
        difficultyMultiplier: 1250,
        notes: "Slow",
      }),
      expect.objectContaining({
        position: 1,
        categoryName: "Pull",
        variantName: "Ring row",
      }),
    ])
    expect(inserted[2]).toEqual([
      expect.objectContaining({ position: 0, reps: 8 }),
      expect.objectContaining({ position: 1, reps: 7 }),
      expect.objectContaining({ position: 0, reps: 6 }),
    ])
  })

  it("rejects invalid nested data without issuing any writes", async () => {
    const { db, batch } = database()
    await expect(
      createWorkout(db, "owner", {
        workoutDate: "2030-02-30",
        exercises: [{ variantId: "variant", sets: [10, "", 2.5] }],
      })
    ).resolves.toMatchObject({ ok: false, error: "validation" })
    expect(batch).not.toHaveBeenCalled()
  })

  it("saves a template draft exactly as submitted without re-reading its source", async () => {
    const { db, batch, inserted } = database()

    const result = await createWorkoutFromTemplate(db, "owner", {
      templateId: "deleted-or-changed-template",
      workoutDate: "2030-02-03",
      name: "Independent draft",
      exercises: [
        { variantId: "variant", notes: "Second", sets: [4] },
        { variantId: "variant", notes: "First", sets: [8, 7] },
        { variantId: "variant", notes: "Repeated", sets: [3] },
      ],
    })

    expect(result).toMatchObject({ ok: true })
    expect(batch).toHaveBeenCalledOnce()
    expect(inserted[1]).toEqual([
      expect.objectContaining({ position: 0, notes: "Second" }),
      expect.objectContaining({ position: 1, notes: "First" }),
      expect.objectContaining({ position: 2, notes: "Repeated" }),
    ])
    expect(inserted[2]).toEqual([
      expect.objectContaining({ position: 0, reps: 4 }),
      expect.objectContaining({ position: 0, reps: 8 }),
      expect.objectContaining({ position: 1, reps: 7 }),
      expect.objectContaining({ position: 0, reps: 3 }),
    ])
    expect(
      (db as unknown as { query: Record<string, unknown> }).query
        .workoutTemplates
    ).toBeUndefined()
  })

  it.each([
    ["an archived variant", { ...variant, archivedAt: new Date() }],
    [
      "a variant in an archived category",
      {
        ...variant,
        category: { ...variant.category, archivedAt: new Date() },
      },
    ],
  ])("rejects %s atomically", async (_label, inactive) => {
    const { db, batch, findMany } = database()
    findMany.mockResolvedValue([inactive])

    await expect(
      createWorkoutFromTemplate(db, "owner", {
        templateId: "template",
        workoutDate: "2030-02-03",
        exercises: [{ variantId: "variant", sets: [10] }],
      })
    ).resolves.toMatchObject({ ok: false, error: "validation" })
    expect(batch).not.toHaveBeenCalled()
  })
})
