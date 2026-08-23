import { describe, expect, it } from "vitest"

import { createInMemoryDrizzle } from "../../test/in-memory-drizzle"
import {
  createWorkout,
  getWorkout,
  listWorkouts,
  updateWorkout,
} from "../workouts"

function database() {
  const db = createInMemoryDrizzle()
  const now = new Date()
  db.seed("exerciseCategories", {
    id: "category",
    userId: "owner",
    name: "Pull",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  })
  db.seed("exerciseVariants", {
    id: "variant",
    userId: "owner",
    categoryId: "category",
    name: "Row",
    difficultyMultiplier: 1000,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  })
  return db
}

const input = {
  workoutDate: "2030-02-03",
  clientRequestId: "draft-1",
  exercises: [{ variantId: "variant", sets: [8, 7] }],
}

describe("idempotent workout creation", () => {
  it("returns the original workout without duplicate rows for retry and concurrent requests", async () => {
    const db = database()
    const [first, second] = await Promise.all([
      createWorkout(db, "owner", input),
      createWorkout(db, "owner", input),
    ])
    expect(first).toMatchObject({ ok: true })
    expect(second).toMatchObject({ ok: true })
    if (!first.ok || !second.ok) throw new Error("Expected successful requests")
    expect(first.value.id).toBe(second.value.id)
    expect(first.value.exercises[0]).toMatchObject({
      sourceVariantId: "variant",
      sets: [{ reps: 8 }, { reps: 7 }],
    })
    expect(second.value.exercises[0]).toMatchObject({
      sourceVariantId: "variant",
      sets: [{ reps: 8 }, { reps: 7 }],
    })
    expect(first.value.exercises[0].sets).toHaveLength(2)
    expect(second.value.exercises[0].sets).toHaveLength(2)
    expect(db._tables.workouts.rows).toHaveLength(1)
    expect(db._tables.workoutExercises.rows).toHaveLength(1)
    expect(db._tables.workoutSets.rows).toHaveLength(2)
  })

  it("does not expose idempotency fields in workout details", async () => {
    const db = database()
    const created = await createWorkout(db, "owner", input)
    if (!created.ok) throw new Error("Expected workout creation to succeed")

    const updated = await updateWorkout(db, "owner", {
      ...input,
      id: created.value.id,
      notes: "Updated",
    })
    if (!updated.ok) throw new Error("Expected workout update to succeed")

    const detail = await getWorkout(db, "owner", created.value.id)
    if (!detail) throw new Error("Expected persisted workout")
    const listed = await listWorkouts(db, "owner")
    for (const workout of [created.value, updated.value, detail, ...listed]) {
      expect(workout).not.toHaveProperty("clientRequestId")
      expect(workout).not.toHaveProperty("requestPayloadHash")
    }
  })

  it("rejects an incompatible owner collision without writing rows", async () => {
    const db = database()
    await createWorkout(db, "owner", input)
    await expect(
      createWorkout(db, "owner", { ...input, name: "Different" })
    ).resolves.toEqual({ ok: false, error: "request_conflict" })
    expect(db._tables.workouts.rows).toHaveLength(1)
    expect(db._tables.workoutExercises.rows).toHaveLength(1)
  })

  it("does not let another owner discover or overwrite an owner request", async () => {
    const db = database()
    await createWorkout(db, "owner", input)
    await expect(createWorkout(db, "other", input)).resolves.toMatchObject({
      ok: false,
      error: "validation",
    })
    expect(db._tables.workouts.rows).toHaveLength(1)
  })
})
