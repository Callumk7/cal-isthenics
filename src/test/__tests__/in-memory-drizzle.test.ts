import { and, asc, eq, isNull } from "drizzle-orm"
import { describe, expect, it } from "vitest"

import * as schema from "@/db/schema"
import { createInMemoryDrizzle } from "@/test/in-memory-drizzle"

const now = new Date("2030-01-01T00:00:00.000Z")

describe("createInMemoryDrizzle", () => {
  it("keeps each factory result's rows and reset operation isolated", () => {
    const first = createInMemoryDrizzle()
    const second = createInMemoryDrizzle()

    first.seed("users", { id: "first" })
    second.seed("users", { id: "second" })
    first.reset()

    expect(first._tables.users.rows).toEqual([])
    expect(second._tables.users.rows).toEqual([{ id: "second" }])
  })

  it("supports the filtering, ordering, projection, and relations used by domain tests", async () => {
    const db = createInMemoryDrizzle()
    db.seed("exerciseCategories", [
      { id: "push", userId: "owner", name: "Push", archivedAt: null },
      { id: "pull", userId: "owner", name: "Pull", archivedAt: null },
      { id: "other", userId: "other", name: "Other", archivedAt: null },
    ])
    db.seed("exerciseVariants", [
      {
        id: "row",
        userId: "owner",
        categoryId: "pull",
        name: "Ring row",
        archivedAt: null,
      },
      {
        id: "old-row",
        userId: "owner",
        categoryId: "pull",
        name: "Archived row",
        archivedAt: now,
      },
    ])

    const categories = await db.query.exerciseCategories.findMany({
      where: and(
        eq(schema.exerciseCategories.userId, "owner"),
        isNull(schema.exerciseCategories.archivedAt)
      ),
      orderBy: [asc(schema.exerciseCategories.name)],
      columns: { id: true, name: true },
      with: {
        variants: {
          where: isNull(schema.exerciseVariants.archivedAt),
          orderBy: [asc(schema.exerciseVariants.name)],
          columns: { id: true, name: true },
        },
      },
    })

    expect(categories).toEqual([
      {
        id: "pull",
        name: "Pull",
        variants: [{ id: "row", name: "Ring row" }],
      },
      { id: "push", name: "Push", variants: [] },
    ])
  })

  it("supports projected returning values for updates", async () => {
    const db = createInMemoryDrizzle()
    db.seed("exerciseCategories", {
      id: "pull",
      userId: "owner",
      name: "Pull",
      archivedAt: null,
    })

    const returned = await db
      .update(schema.exerciseCategories)
      .set({ name: "Back" })
      .where(eq(schema.exerciseCategories.id, "pull"))
      .returning({ id: schema.exerciseCategories.id })
      .all()

    expect(returned).toEqual([{ id: "pull" }])
    expect(db._tables.exerciseCategories.rows[0]).toMatchObject({
      id: "pull",
      name: "Back",
    })
  })

  it("executes batches and cascades aggregate deletions", async () => {
    const db = createInMemoryDrizzle()
    await db.batch([
      db.insert(schema.workouts).values({
        id: "workout",
        userId: "owner",
        workoutDate: "2030-01-01",
        name: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(schema.workoutExercises).values({
        id: "exercise",
        workoutId: "workout",
        sourceVariantId: null,
        position: 0,
        categoryName: "Pull",
        variantName: "Ring row",
        difficultyMultiplier: 1250,
        notes: null,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(schema.workoutSets).values({
        id: "set",
        workoutExerciseId: "exercise",
        position: 0,
        reps: 8,
        createdAt: now,
        updatedAt: now,
      }),
    ])

    expect(db._tables.workouts.rows).toHaveLength(1)
    expect(db._tables.workoutExercises.rows).toHaveLength(1)
    expect(db._tables.workoutSets.rows).toHaveLength(1)

    await db.delete(schema.workouts).where(eq(schema.workouts.id, "workout"))

    expect(db._tables.workouts.rows).toEqual([])
    expect(db._tables.workoutExercises.rows).toEqual([])
    expect(db._tables.workoutSets.rows).toEqual([])
  })
})
