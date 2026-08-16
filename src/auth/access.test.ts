import { describe, expect, it } from "vitest"

import { getAuthRedirect } from "./access"

describe("authentication route boundary", () => {
  it("redirects unauthenticated app requests to login", () => {
    expect(getAuthRedirect("/sample", false)).toBe("/login")
    expect(getAuthRedirect("/sample-two", false)).toBe("/login")
    expect(getAuthRedirect("/", false)).toBe("/login")
  })

  it("allows authenticated app requests", () => {
    expect(getAuthRedirect("/sample", true)).toBeNull()
  })

  it("keeps unauthenticated users on login and redirects authenticated users", () => {
    expect(getAuthRedirect("/login", false)).toBeNull()
    expect(getAuthRedirect("/login", true)).toBe("/sample")
  })
})
