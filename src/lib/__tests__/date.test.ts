import { afterEach, describe, expect, it, vi } from "vitest"
import { isValidCalendarDate, localCalendarToday } from "../date"

describe("isValidCalendarDate", () => {
  it("accepts well-formed existing dates", () => {
    for (const value of [
      "2026-08-18",
      "2026-12-31",
      "2024-02-29",
      "2000-02-29",
    ]) {
      expect(isValidCalendarDate(value)).toBe(true)
    }
  })

  it("rejects non-existent calendar dates", () => {
    for (const value of [
      "2026-02-30",
      "2025-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-00-10",
      "2026-01-00",
    ]) {
      expect(isValidCalendarDate(value)).toBe(false)
    }
  })

  it("rejects dates with the wrong format", () => {
    for (const value of [
      "18/08/2026",
      "2026-8-18",
      "2026-08-1",
      "2026-08-18T00:00:00Z",
      " 2026-08-18",
      "",
    ]) {
      expect(isValidCalendarDate(value)).toBe(false)
    }
  })

  it("rejects non-string values", () => {
    for (const value of [undefined, null, 42, {}, new Date("2026-08-18")]) {
      expect(isValidCalendarDate(value)).toBe(false)
    }
  })
})

describe("localCalendarToday", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("returns the next local date for UTC+8", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-18T20:00:00Z"))
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-480)

    const today = localCalendarToday()

    expect(today).toBe("2026-08-19")
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("returns the local date for UTC-6", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-18T20:00:00Z"))
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(360)

    const today = localCalendarToday()

    expect(today).toBe("2026-08-18")
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("returns the UTC date for UTC", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-18T12:34:56Z"))
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(0)

    const today = localCalendarToday()

    expect(today).toBe("2026-08-18")
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
