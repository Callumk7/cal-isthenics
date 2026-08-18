import { describe, expect, it } from "vitest"

import { isNavActive } from "../app-shell"

describe("isNavActive", () => {
  it("keeps Record active for workout detail routes without broadening other routes", () => {
    expect(isNavActive("/record/workout-1", "/record")).toBe(true)
    expect(isNavActive("/record", "/record")).toBe(true)
    expect(isNavActive("/records", "/record")).toBe(false)
    expect(isNavActive("/history/workout-1", "/history")).toBe(true)
    expect(isNavActive("/record/workout-1", "/history")).toBe(false)
  })
})
