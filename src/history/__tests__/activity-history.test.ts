import { describe, expect, it } from "vitest"

import { deleteRunningWorkout } from "../../running/running-workouts"
import { createInMemoryDrizzle } from "../../test/in-memory-drizzle"
import { listActivityHistory } from "../activity-history"

const created = (seconds: number) =>
  new Date(`2030-02-01T00:00:${String(seconds).padStart(2, "0")}.000Z`)

function run(
  id: string,
  date = "2030-02-01",
  seconds = 0,
  userId = "owner",
  speed: number | null = null
) {
  return {
    id,
    userId,
    workoutDate: date,
    distanceMetres: 5000,
    durationSeconds: 1500,
    calories: 400,
    manualSpeedMilliKmH: speed,
    createdAt: created(seconds),
    updatedAt: created(seconds),
  }
}

function workout(
  id: string,
  date = "2030-02-01",
  seconds = 0,
  userId = "owner",
  name: string | null = null
) {
  return {
    id,
    userId,
    workoutDate: date,
    name,
    notes: null,
    createdAt: created(seconds),
    updatedAt: created(seconds),
  }
}

async function history(
  db: ReturnType<typeof createInMemoryDrizzle>,
  filters = {}
) {
  const result = await listActivityHistory(db, "owner", filters)
  if (!result.ok) throw new Error("Expected valid history result")
  return result.value
}

describe("listActivityHistory", () => {
  it("returns every distinct mixed same-date record in deterministic order", async () => {
    const db = createInMemoryDrizzle()
    db.seed("workouts", [
      workout("w1", "2030-02-01", 2),
      workout("w2", "2030-02-01", 4),
    ])
    db.seed("runningWorkouts", [
      run("r1", "2030-02-01", 1),
      run("r2", "2030-02-01", 3),
      run("r3", "2030-02-01", 5),
      run("old", "2030-01-31", 9),
    ])

    const page = await history(db)
    expect(page.items.map((item) => `${item.type}:${item.id}`)).toEqual([
      "running:r3",
      "calisthenics:w2",
      "running:r2",
      "calisthenics:w1",
      "running:r1",
      "running:old",
    ])
    expect(
      new Set(page.items.map((item) => `${item.type}:${item.id}`)).size
    ).toBe(6)
  })

  it("keeps identical same-date runs independently addressable and uses id ties", async () => {
    const db = createInMemoryDrizzle()
    db.seed("runningWorkouts", [
      run("a", "2030-02-01", 1),
      run("b", "2030-02-01", 1),
    ])
    const page = await history(db)
    expect(page.items.map((item) => item.id)).toEqual(["b", "a"])
    const [first, second] = page.items
    expect({ ...first, id: "" }).toEqual({ ...second, id: "" })
  })

  it("paginates crowded dates without gaps or duplicates", async () => {
    const db = createInMemoryDrizzle()
    db.seed(
      "runningWorkouts",
      Array.from({ length: 12 }, (_, index) =>
        run(`r${String(index).padStart(2, "0")}`, "2030-02-01", index)
      )
    )
    const ids: string[] = []
    let cursor: string | undefined
    do {
      const page = await history(db, { limit: 5, cursor })
      expect(page.items.length).toBeLessThanOrEqual(5)
      ids.push(...page.items.map((item) => item.id))
      cursor = page.nextCursor ?? undefined
    } while (cursor)
    expect(ids).toEqual(
      Array.from(
        { length: 12 },
        (_, index) => `r${String(11 - index).padStart(2, "0")}`
      )
    )
    expect(new Set(ids).size).toBe(12)
  })

  it("uses inclusive calendar-only date filters and validates ranges and cursors", async () => {
    const db = createInMemoryDrizzle()
    db.seed("runningWorkouts", [
      run("before", "2030-01-31"),
      run("inside", "2030-02-01"),
      run("after", "2030-02-02"),
    ])
    expect(
      (await history(db, { from: "2030-02-01", to: "2030-02-01" })).items.map(
        (item) => item.id
      )
    ).toEqual(["inside"])
    for (const filters of [
      { from: "no" },
      { from: "2030-02-02", to: "2030-02-01" },
      { from: "2030-01-01", to: "2031-01-03" },
    ]) {
      const result = await listActivityHistory(db, "owner", filters)
      expect(result).toMatchObject({ ok: false, error: "validation" })
    }
    await expect(
      listActivityHistory(db, "owner", { cursor: "garbage" })
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { cursor: "Enter a valid continuation cursor." },
    })
  })

  it("calculates summaries, includes nullable names, and isolates ownership", async () => {
    const db = createInMemoryDrizzle()
    db.seed("workouts", [
      workout("w", "2030-02-01", 2, "owner", "Strength"),
      workout("unnamed", "2030-02-01", 0),
      workout("other", "2030-02-02", 3, "other"),
    ])
    db.seed("workoutExercises", [
      {
        id: "e1",
        workoutId: "w",
        position: 0,
        sourceVariantId: null,
        categoryName: "Push",
        variantName: "Push-up",
        difficultyMultiplier: 1000,
        notes: null,
      },
      {
        id: "e2",
        workoutId: "w",
        position: 1,
        sourceVariantId: null,
        categoryName: "Pull",
        variantName: "Row",
        difficultyMultiplier: 1000,
        notes: null,
      },
    ])
    db.seed("workoutSets", [
      { id: "s1", workoutExerciseId: "e1", position: 0, reps: 5 },
      { id: "s2", workoutExerciseId: "e1", position: 1, reps: 6 },
      { id: "s3", workoutExerciseId: "e2", position: 0, reps: 7 },
    ])
    db.seed("runningWorkouts", [
      run("manual", "2030-02-01", 1, "owner", 15000),
      run("calculated", "2030-02-01", 3),
      run("other-run", "2030-02-02", 1, "other"),
    ])
    const items = (await history(db)).items
    expect(items.map((item) => item.id)).toEqual([
      "calculated",
      "w",
      "manual",
      "unnamed",
    ])
    expect(items[1]).toMatchObject({
      type: "calisthenics",
      name: "Strength",
      exerciseCount: 2,
      setCount: 3,
      repCount: 18,
    })
    expect(items[2]).toMatchObject({
      type: "running",
      overrideActive: true,
      calculatedAverageSpeedKmH: 12,
      effectiveAverageSpeedKmH: 15,
    })
    expect(items[0]).toMatchObject({ type: "running", overrideActive: false })
    expect(items[3]).toMatchObject({ type: "calisthenics", name: null })
  })

  it("deleting one identical run leaves its same-date sibling in history", async () => {
    const db = createInMemoryDrizzle()
    db.seed("runningWorkouts", [run("first"), run("second")])
    await deleteRunningWorkout(db, "owner", "first")
    expect((await history(db)).items.map((item) => item.id)).toEqual(["second"])
  })
})
