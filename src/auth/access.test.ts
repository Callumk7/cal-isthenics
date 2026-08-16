import { describe, expect, it } from "vitest"

import { getLoginHref, getSafeReturnTo } from "./access"

describe("authentication redirects", () => {
  it("preserves an application path and query for login", () => {
    expect(getLoginHref("/history", "?period=month")).toBe(
      "/login?returnTo=%2Fhistory%3Fperiod%3Dmonth"
    )
    expect(getLoginHref("/", "")).toBe("/login")
  })

  it("accepts only local return destinations", () => {
    expect(getSafeReturnTo("/record?day=1#workout")).toBe(
      "/record?day=1#workout"
    )
    expect(getSafeReturnTo("https://attacker.example/path")).toBeUndefined()
    expect(getSafeReturnTo("//attacker.example/path")).toBeUndefined()
    expect(getSafeReturnTo("/\\attacker.example/path")).toBeUndefined()
  })

  it("does not allow login to recursively return to itself", () => {
    expect(getSafeReturnTo("/login")).toBeUndefined()
    expect(getSafeReturnTo(undefined)).toBeUndefined()
  })
})
