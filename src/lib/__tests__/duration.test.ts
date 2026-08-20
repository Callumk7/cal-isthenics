import { describe, expect, it } from "vitest"

import { formatDuration, parseDuration } from "../duration"

describe("parseDuration", () => {
  it("parses minute- and second-precision time-input values", () => {
    expect(parseDuration("00:45")).toBe(2700)
    expect(parseDuration("01:02:03")).toBe(3723)
  })

  it("rejects zero and malformed time-input values", () => {
    for (const value of ["", "00:00", "00:00:00", "24:00", "12:60", "1:02"]) {
      expect(parseDuration(value)).toBeNull()
    }
  })
})

describe("formatDuration", () => {
  it("formats saved durations with seconds for lossless editor hydration", () => {
    expect(formatDuration(2700)).toBe("00:45:00")
    expect(formatDuration(3723)).toBe("01:02:03")
  })
})
