import { describe, expect, it } from "vitest"

import { createInMemoryDrizzle } from "../../test/in-memory-drizzle"
import { getPreviousPerformanceCues, getRepeatWorkout } from "../workouts"

const now = new Date("2030-01-01T00:00:00.000Z")

function seedLibrary(db: ReturnType<typeof createInMemoryDrizzle>) {
  db.seed("exerciseCategories", [
    {
      id: "category",
      userId: "owner",
      name: "Pull",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "archived-category",
      userId: "owner",
      name: "Old",
      archivedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ])
  db.seed("exerciseVariants", [
    {
      id: "variant",
      userId: "owner",
      categoryId: "category",
      name: "Row",
      difficultyMultiplier: 1000,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "archived-variant",
      userId: "owner",
      categoryId: "category",
      name: "Old row",
      difficultyMultiplier: 1000,
      archivedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "category-archived-variant",
      userId: "owner",
      categoryId: "archived-category",
      name: "Old pull",
      difficultyMultiplier: 1000,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ])
}

function seedWorkout(
  db: ReturnType<typeof createInMemoryDrizzle>,
  id: string,
  date: string,
  createdAt: Date,
  entries: Array<{
    id: string
    variantId: string | null
    position: number
    reps: number[]
  }>,
  userId = "owner"
) {
  db.seed("workouts", {
    id,
    userId,
    workoutDate: date,
    name: null,
    notes: null,
    clientRequestId: null,
    requestPayloadHash: null,
    createdAt,
    updatedAt: createdAt,
  })
  db.seed(
    "workoutExercises",
    entries.map((entry) => ({
      id: entry.id,
      workoutId: id,
      sourceVariantId: entry.variantId,
      position: entry.position,
      categoryName: "Snapshot category",
      variantName: "Snapshot variant",
      difficultyMultiplier: 1000,
      notes: null,
      createdAt,
      updatedAt: createdAt,
    }))
  )
  db.seed(
    "workoutSets",
    entries.flatMap((entry) =>
      entry.reps.map((reps, position) => ({
        id: `${entry.id}-${position}`,
        workoutExerciseId: entry.id,
        position,
        reps,
        createdAt,
        updatedAt: createdAt,
      }))
    )
  )
}

describe("repeat source and previous-performance operations", () => {
  it("does not disclose foreign repeat sources", async () => {
    const db = createInMemoryDrizzle()
    seedLibrary(db)
    seedWorkout(
      db,
      "foreign",
      "2030-02-01",
      now,
      [{ id: "x", variantId: "variant", position: 0, reps: [8] }],
      "other"
    )
    await expect(getRepeatWorkout(db, "owner", "foreign")).resolves.toEqual({
      ok: false,
      error: "not_found",
    })
  })

  it("returns ordered active source identities and rejects every unavailable source entry", async () => {
    const db = createInMemoryDrizzle()
    seedLibrary(db)
    seedWorkout(db, "good", "2030-02-01", now, [
      { id: "first", variantId: "variant", position: 1, reps: [9, 8] },
      { id: "second", variantId: "variant", position: 0, reps: [7] },
    ])
    await expect(getRepeatWorkout(db, "owner", "good")).resolves.toMatchObject({
      ok: true,
      value: {
        exercises: [
          {
            id: "second",
            activeVariant: { id: "variant", name: "Row" },
            sets: [{ reps: 7 }],
          },
          { id: "first", sets: [{ reps: 9 }, { reps: 8 }] },
        ],
      },
    })

    seedWorkout(db, "bad", "2030-02-01", now, [
      { id: "missing", variantId: null, position: 0, reps: [1] },
      { id: "archived", variantId: "archived-variant", position: 1, reps: [1] },
      {
        id: "category-archived",
        variantId: "category-archived-variant",
        position: 2,
        reps: [1],
      },
    ])
    await expect(getRepeatWorkout(db, "owner", "bad")).resolves.toMatchObject({
      ok: false,
      error: "repeat_unavailable",
      unavailable: [
        {
          sourceExerciseId: "missing",
          reason: "missing_variant",
          variantName: "Snapshot variant",
        },
        { sourceExerciseId: "archived", reason: "archived_variant" },
        { sourceExerciseId: "category-archived", reason: "archived_category" },
      ],
    })
  })

  it("uses date, creation, ID, and exercise-position ordering for one stable cue per repeated variant", async () => {
    const db = createInMemoryDrizzle()
    seedLibrary(db)
    seedWorkout(db, "a", "2030-02-03", new Date("2030-02-03T01:00:00Z"), [
      { id: "a0", variantId: "variant", position: 0, reps: [5] },
    ])
    seedWorkout(db, "y", "2030-02-03", new Date("2030-02-03T02:00:00Z"), [
      { id: "y0", variantId: "variant", position: 0, reps: [6] },
    ])
    seedWorkout(db, "z", "2030-02-03", new Date("2030-02-03T02:00:00Z"), [
      { id: "z1", variantId: "variant", position: 1, reps: [6] },
      { id: "z0", variantId: "variant", position: 0, reps: [7, 6] },
    ])
    await expect(
      getPreviousPerformanceCues(
        db,
        "owner",
        ["variant", "variant"],
        "2030-02-03"
      )
    ).resolves.toEqual([
      {
        variantId: "variant",
        cue: { workoutDate: "2030-02-03", reps: [7, 6] },
      },
      {
        variantId: "variant",
        cue: { workoutDate: "2030-02-03", reps: [7, 6] },
      },
    ])
    await expect(
      getPreviousPerformanceCues(db, "owner", ["variant"], "2030-02-02")
    ).resolves.toEqual([{ variantId: "variant", cue: null }])
    await expect(
      getPreviousPerformanceCues(
        db,
        "owner",
        ["archived-variant"],
        "2030-02-03"
      )
    ).resolves.toBeUndefined()
  })
})
