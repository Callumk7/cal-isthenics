import { describe, expect, it } from "vitest"

import { createInMemoryDrizzle } from "../../test/in-memory-drizzle"
import { createWorkout } from "../workouts"

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
    expect((first as { value: { id: string } }).value.id).toBe(
      (second as { value: { id: string } }).value.id
    )
    expect(db._tables.workouts.rows).toHaveLength(1)
    expect(db._tables.workoutExercises.rows).toHaveLength(1)
    expect(db._tables.workoutSets.rows).toHaveLength(2)
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
