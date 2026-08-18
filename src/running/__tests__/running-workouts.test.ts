import { describe, expect, it, vi } from "vitest"

import {
  calculateRunningMetrics,
  createRunningWorkout,
  parseDistanceKm,
  parseManualSpeedKmH,
} from "../running-workouts"

describe("running workout values", () => {
  it("converts distance and speed to lossless integer thousandths", () => {
    expect(parseDistanceKm("5.001")).toEqual({ value: 5001 })
    expect(parseDistanceKm("0.001")).toEqual({ value: 1 })
    expect(parseManualSpeedKmH("10.125")).toEqual({ value: 10125 })
    expect(parseManualSpeedKmH("")).toEqual({ value: null })
    for (const value of ["", "1.0001", 0, -1, Infinity, "1e2"])
      expect(parseDistanceKm(value)).toHaveProperty("error")
  })

  it("calculates speed and intensity independently of an override", () => {
    expect(calculateRunningMetrics(5000, 1800, null)).toEqual({
      calculatedAverageSpeedKmH: 10,
      effectiveAverageSpeedKmH: 10,
      runningIntensity: 50,
    })
    expect(calculateRunningMetrics(5000, 1800, 12500)).toEqual({
      calculatedAverageSpeedKmH: 10,
      effectiveAverageSpeedKmH: 12.5,
      runningIntensity: 50,
    })
  })

  it("returns field errors and performs no write for invalid input", async () => {
    const values = vi.fn()
    const db = { insert: vi.fn(() => ({ values })) } as never
    const result = await createRunningWorkout(db, "owner", {
      workoutDate: "2030-02-30",
      distanceKm: 0,
      durationSeconds: -1,
      calories: 2.5,
      manualSpeedKmH: "NaN",
    })
    expect(result).toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: {
        workoutDate: expect.any(String),
        distanceKm: expect.any(String),
        durationSeconds: expect.any(String),
        calories: expect.any(String),
        manualSpeedKmH: expect.any(String),
      },
    })
    expect(values).not.toHaveBeenCalled()
  })

  it("creates a fully calculated run", async () => {
    const values = vi.fn().mockResolvedValue(undefined)
    const db = { insert: vi.fn(() => ({ values })) } as never
    const result = await createRunningWorkout(
      db,
      "owner",
      {
        workoutDate: "2030-02-03",
        distanceKm: "5.000",
        durationSeconds: "1800",
        calories: "400",
        manualSpeedKmH: "12.500",
      },
      new Date("2030-02-03T12:00:00Z")
    )
    expect(result).toMatchObject({
      ok: true,
      value: {
        userId: "owner",
        distanceMetres: 5000,
        durationSeconds: 1800,
        calories: 400,
        manualSpeedMilliKmH: 12500,
        calculatedAverageSpeedKmH: 10,
        effectiveAverageSpeedKmH: 12.5,
        runningIntensity: 50,
      },
    })
    expect(values).toHaveBeenCalledOnce()
  })
})
