import { describe, expect, it } from "vitest"

import {
  formatDateHeading,
  formatDistanceKm,
  formatDurationSeconds,
  formatSpeedKmH,
} from "../format"

describe("history formatters", () => {
  it("formats distances in kilometres", () => {
    expect(formatDistanceKm(5000)).toBe("5.00")
  })

  it("formats durations at each unit boundary", () => {
    expect(formatDurationSeconds(45)).toBe("45 sec")
    expect(formatDurationSeconds(1830)).toBe("30 min")
    expect(formatDurationSeconds(7320)).toBe("2 h 2 min")
  })

  it("formats speeds to two decimal places", () => {
    expect(formatSpeedKmH(9.5)).toBe("9.50")
  })

  it("formats calendar dates without timezone conversion", () => {
    expect(formatDateHeading("2026-08-18")).toBe("18 Aug 2026")
    expect(formatDateHeading("not-a-date")).toBe("not-a-date")
  })
})
