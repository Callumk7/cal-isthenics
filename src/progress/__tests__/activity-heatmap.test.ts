import { describe, expect, it } from "vitest"

import { buildActivityHeatmap, trailing365DayRange } from "../activity-heatmap"

const calDay = (date: string, scoreMilli: number, count = 1) => ({
  workoutDate: date,
  scoreMilli,
  workouts: Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: null,
    workoutDate: date,
    scoreMilli: scoreMilli / count,
    exercises: [],
  })),
})
const runDay = (date: string, relativeIntensity: number, runCount = 1) => ({
  workoutDate: date,
  relativeIntensity,
  runCount,
  distanceKm: runCount * 5,
  durationSeconds: 1800,
})

describe("activity heatmap", () => {
  it("creates exactly 365 calendar dates through both leap and year boundaries", () => {
    expect(trailing365DayRange("2024-03-01")).toEqual({
      from: "2023-03-03",
      to: "2024-03-01",
    })
    const days = buildActivityHeatmap([], [], trailing365DayRange("2024-03-01"))
    expect(days).toHaveLength(365)
    expect(days[0].date).toBe("2023-03-03")
    expect(days.at(-1)?.date).toBe("2024-03-01")
    expect(days.every((day) => day.level === 0)).toBe(true)
  })

  it("normalizes one modality and produces all five deterministic levels", () => {
    const range = { from: "2026-01-01", to: "2026-01-05" }
    const days = buildActivityHeatmap(
      [
        calDay("2026-01-02", 1),
        calDay("2026-01-03", 26),
        calDay("2026-01-04", 51),
        calDay("2026-01-05", 100),
      ],
      [],
      range
    )
    expect(days.map((day) => day.level)).toEqual([0, 1, 2, 3, 4])
  })

  it("averages independently normalized modalities, including missing dates and ties", () => {
    const days = buildActivityHeatmap(
      [calDay("2026-01-01", 100, 2), calDay("2026-01-02", 50)],
      [runDay("2026-01-02", 20, 2), runDay("2026-01-03", 20)],
      { from: "2026-01-01", to: "2026-01-03" }
    )
    expect(days.map((day) => [day.score, day.level])).toEqual([
      [0.5, 2],
      [0.75, 3],
      [0.5, 2],
    ])
    expect(days[0].workoutCount).toBe(2)
    expect(days[1]).toMatchObject({ runCount: 2, runningDistanceKm: 10 })
  })
})
