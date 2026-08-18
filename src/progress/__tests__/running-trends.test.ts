import { describe, expect, it } from "vitest"

import { createInMemoryDrizzle } from "@/test/in-memory-drizzle"
import { aggregateRunningTrends, listRunningTrends } from "../running-trends"

describe("running trends", () => {
  it("aggregates same-date runs, preserves precision, and fills boundaries and gaps", () => {
    const days = aggregateRunningTrends(
      [
        {
          workoutDate: "2026-08-01",
          distanceMetres: 5000,
          durationSeconds: 1800,
        },
        {
          workoutDate: "2026-08-01",
          distanceMetres: 1234,
          durationSeconds: 601,
        },
        {
          workoutDate: "2026-08-03",
          distanceMetres: 2500,
          durationSeconds: 900,
        },
        { workoutDate: "2026-07-31", distanceMetres: 9999, durationSeconds: 1 },
      ],
      { from: "2026-08-01", to: "2026-08-03" }
    )

    expect(days.map((day) => day.workoutDate)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ])
    expect(days[0]).toMatchObject({
      distanceKm: 6.234,
      durationSeconds: 2401,
      runCount: 2,
    })
    expect(days[0].relativeIntensity).toBeCloseTo(
      50 + (1.234 * 1.234 * 3600) / 601,
      12
    )
    expect(days[1]).toMatchObject({
      distanceKm: 0,
      relativeIntensity: 0,
      runCount: 0,
    })
    expect(days[2].relativeIntensity).toBe(25)
  })

  it("is independent of manual speed and calories", () => {
    const common = {
      workoutDate: "2026-08-01",
      distanceMetres: 5000,
      durationSeconds: 1800,
    }
    const first = aggregateRunningTrends(
      [{ ...common, manualSpeedMilliKmH: 1, calories: 1 }],
      { from: common.workoutDate, to: common.workoutDate }
    )
    const second = aggregateRunningTrends(
      [{ ...common, manualSpeedMilliKmH: 99_999, calories: 9999 }],
      { from: common.workoutDate, to: common.workoutDate }
    )
    expect(first).toEqual(second)
    expect(first[0]).toMatchObject({ distanceKm: 5, relativeIntensity: 50 })
  })

  it("scopes the aggregate query to the supplied owner", async () => {
    const db = createInMemoryDrizzle()
    const base = {
      workoutDate: "2026-08-01",
      durationSeconds: 1800,
      calories: 100,
      manualSpeedMilliKmH: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    db.seed("runningWorkouts", [
      { ...base, id: "mine", userId: "owner", distanceMetres: 5000 },
      { ...base, id: "foreign", userId: "other", distanceMetres: 20000 },
    ])
    const days = await listRunningTrends(db, "owner", {
      from: "2026-08-01",
      to: "2026-08-01",
    })
    expect(days[0]).toMatchObject({
      distanceKm: 5,
      relativeIntensity: 50,
      runCount: 1,
    })
  })
})
