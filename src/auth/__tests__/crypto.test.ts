import { describe, expect, it } from "vitest"

import {
  PASSWORD_HASH_ITERATIONS,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../crypto"

describe("authentication credentials", () => {
  it("stores a salted password hash and verifies only the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple")

    expect(hash).not.toContain("correct horse battery staple")
    expect(hash).toContain(`$${PASSWORD_HASH_ITERATIONS}$`)
    await expect(
      verifyPassword("correct horse battery staple", hash)
    ).resolves.toBe(true)
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false)
    await expect(verifyPassword("anything", "invalid")).resolves.toBe(false)
    await expect(
      verifyPassword("anything", `pbkdf2-sha256$100001$c2FsdA==$aGFzaA==`)
    ).resolves.toBe(false)
  })

  it("generates random session tokens and creates deterministic one-way lookup hashes", async () => {
    const first = generateSessionToken()
    const second = generateSessionToken()

    expect(first).not.toBe(second)
    expect(await hashSessionToken(first)).toBe(await hashSessionToken(first))
    expect(await hashSessionToken(first)).not.toBe(first)
  })
})
