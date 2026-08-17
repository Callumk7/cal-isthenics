import { describe, expect, it } from "vitest"

import { SESSION_DURATION_SECONDS, sessionCookieOptions } from "../config"

describe("session cookie configuration", () => {
  it("is persistent and unavailable to client-side JavaScript", () => {
    expect(sessionCookieOptions).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    })
  })
})
