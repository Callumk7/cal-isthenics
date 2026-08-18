import { and, eq, gte, lte } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import {
  aggregateCalisthenicsIntensity,
  listCalisthenicsIntensity,
  trailingTwelveMonthRange,
} from "../calisthenics-intensity"
import { workouts } from "../../db/schema"

const exercise = (overrides: Record<string, unknown> = {}) => ({
  categoryName: "Pull snapshot",
  variantName: "Row snapshot",
  difficultyMultiplier: 1000,
  sourceVariant: {
    name: "Ring row",
    difficultyMultiplier: 1500,
    category: { name: "Pull" },
  },
  sets: [{ reps: 8 }, { reps: 4 }],
  ...overrides,
})

describe("calisthenics intensity", () => {
  it("counts every set, exercise instance, and same-date workout once", () => {
    const result = aggregateCalisthenicsIntensity([
      {
        id: "one",
        name: "Morning",
        workoutDate: "2026-08-01",
        exercises: [exercise(), exercise({ sets: [{ reps: 2 }] })],
      },
      {
        id: "two",
        name: null,
        workoutDate: "2026-08-01",
        exercises: [exercise({ sets: [{ reps: 10 }] })],
      },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].scoreMilli).toBe((8 + 4 + 2 + 10) * 1500)
    expect(result[0].workouts.map((workout) => workout.scoreMilli)).toEqual([
      21_000, 15_000,
    ])
  })

  it("uses live archived variant values and snapshot values only without a source", () => {
    const current = aggregateCalisthenicsIntensity([
      {
        id: "one",
        name: null,
        workoutDate: "2026-08-01",
        exercises: [exercise()],
      },
    ])
    expect(current[0].scoreMilli).toBe(18_000)
    expect(current[0].workouts[0].exercises[0]).toMatchObject({
      categoryName: "Pull",
      variantName: "Ring row",
    })

    const fallback = aggregateCalisthenicsIntensity([
      {
        id: "two",
        name: null,
        workoutDate: "2026-08-02",
        exercises: [exercise({ sourceVariant: null })],
      },
    ])
    expect(fallback[0].scoreMilli).toBe(12_000)
    expect(fallback[0].workouts[0].exercises[0].variantName).toBe(
      "Row snapshot"
    )
  })

  it("scopes and orders the date-range query for the owner", async () => {
    const findMany = vi.fn().mockResolvedValue([])
    await listCalisthenicsIntensity(
      { query: { workouts: { findMany } } } as never,
      "owner",
      { from: "2025-08-18", to: "2026-08-18" }
    )
    expect(findMany).toHaveBeenCalledOnce()
    expect(findMany.mock.calls[0][0]).toMatchObject({
      with: {
        exercises: {
          with: { sets: true, sourceVariant: { with: { category: true } } },
        },
      },
    })
    expect(findMany.mock.calls[0][0].where).toEqual(
      and(
        eq(workouts.userId, "owner"),
        gte(workouts.workoutDate, "2025-08-18"),
        lte(workouts.workoutDate, "2026-08-18")
      )
    )
  })

  it("creates an inclusive trailing 12-month local-date range", () => {
    expect(trailingTwelveMonthRange(new Date(2026, 7, 18))).toEqual({
      from: "2025-08-18",
      to: "2026-08-18",
    })
  })

  it("clamps the trailing range to the shorter prior month in leap years", () => {
    expect(trailingTwelveMonthRange(new Date(2024, 1, 29))).toEqual({
      from: "2023-02-28",
      to: "2024-02-29",
    })
  })
})
