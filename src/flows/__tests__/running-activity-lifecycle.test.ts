import { describe, expect, it } from "vitest"

import {
  createExerciseCategory,
  createExerciseVariant,
  editExerciseVariant,
} from "@/exercises/library"
import { listActivityHistory } from "@/history/activity-history"
import { buildActivityHeatmap } from "@/progress/activity-heatmap"
import { listCalisthenicsIntensity } from "@/progress/calisthenics-intensity"
import { listRunningTrends } from "@/progress/running-trends"
import {
  createRunningWorkout,
  deleteRunningWorkout,
  updateRunningWorkout,
} from "@/running/running-workouts"
import { createInMemoryDrizzle } from "@/test/in-memory-drizzle"
import { createWorkout } from "@/workouts/workouts"

const owner = "owner"
const range = { from: "2030-02-03", to: "2030-02-04" }

async function history(db: ReturnType<typeof createInMemoryDrizzle>) {
  const result = await listActivityHistory(db, owner)
  if (!result.ok) throw new Error("Expected activity history")
  return result.value.items
}

describe("running activity lifecycle", () => {
  it("refreshes mixed history and all progress aggregates after a run date and override edit, then deletion", async () => {
    const db = createInMemoryDrizzle()
    const category = await createExerciseCategory(db, owner, { name: "Push" })
    if (!category.ok) throw new Error("Expected category")
    const variant = await createExerciseVariant(db, owner, {
      categoryId: category.value.id,
      name: "Push-up",
      difficultyMultiplier: "1.5",
    })
    if (!variant.ok) throw new Error("Expected variant")
    const workout = await createWorkout(db, owner, {
      workoutDate: "2030-02-03",
      name: "Strength",
      exercises: [{ variantId: variant.value.id, sets: [10] }],
    })
    if (!workout.ok) throw new Error("Expected workout")

    const created = await createRunningWorkout(db, owner, {
      workoutDate: "2030-02-03",
      distanceKm: "5",
      durationSeconds: 1800,
      calories: 400,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) throw new Error("Expected run")
    expect(
      (await history(db)).map((item) => `${item.type}:${item.id}`)
    ).toEqual(
      expect.arrayContaining([
        `calisthenics:${workout.value.id}`,
        `running:${created.value.id}`,
      ])
    )

    const moved = await updateRunningWorkout(db, owner, {
      id: created.value.id,
      workoutDate: "2030-02-04",
      distanceKm: "5",
      durationSeconds: 1800,
      calories: 400,
      manualSpeedKmH: "12.5",
    })
    expect(moved).toMatchObject({
      ok: true,
      value: { workoutDate: "2030-02-04", manualSpeedMilliKmH: 12_500 },
    })
    expect((await history(db)).map((item) => item.date)).toEqual([
      "2030-02-04",
      "2030-02-03",
    ])

    const multiplierEdit = await editExerciseVariant(db, owner, {
      id: variant.value.id,
      name: "Push-up",
      difficultyMultiplier: "2",
    })
    expect(multiplierEdit).toMatchObject({
      ok: true,
      value: { difficultyMultiplier: 2000 },
    })

    const [calisthenics, running] = await Promise.all([
      listCalisthenicsIntensity(db, owner, range),
      listRunningTrends(db, owner, range),
    ])
    expect(calisthenics).toMatchObject([
      { workoutDate: "2030-02-03", scoreMilli: 20_000 },
    ])
    expect(running).toMatchObject([
      {
        workoutDate: "2030-02-04",
        runCount: 1,
        distanceKm: 5,
        relativeIntensity: 50,
      },
    ])
    expect(buildActivityHeatmap(calisthenics, running, range)).toMatchObject([
      { date: "2030-02-03", workoutCount: 1, runCount: 0 },
      { date: "2030-02-04", workoutCount: 0, runCount: 1 },
    ])

    await expect(
      deleteRunningWorkout(db, owner, created.value.id)
    ).resolves.toEqual({
      ok: true,
      value: { id: created.value.id },
    })
    expect((await history(db)).map((item) => item.type)).toEqual([
      "calisthenics",
    ])
    await expect(listRunningTrends(db, owner, range)).resolves.toEqual([])
    expect(buildActivityHeatmap(calisthenics, [], range)[1]).toMatchObject({
      workoutCount: 0,
      runCount: 0,
      level: 0,
    })
  })
})
