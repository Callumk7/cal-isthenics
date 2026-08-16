const encoder = new TextEncoder()
const iterations = 600_000

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function decode(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

/** Hash a password using a salted, deliberately expensive Web Crypto primitive. */
export async function hashPassword(password: string) {
  if (!password) throw new Error("Password must not be empty")
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  )
  return `pbkdf2-sha256$${iterations}$${encode(salt)}$${encode(new Uint8Array(hash))}`
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, count, saltValue, expectedValue] = encodedHash.split("$")
  if (algorithm !== "pbkdf2-sha256" || !count || !saltValue || !expectedValue)
    return false
  const iterationCount = Number(count)
  if (!Number.isSafeInteger(iterationCount) || iterationCount < 1) return false

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    )
    const actual = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: decode(saltValue),
          iterations: iterationCount,
        },
        key,
        256
      )
    )
    const expected = decode(expectedValue)
    if (actual.length !== expected.length) return false
    let difference = 0
    for (let index = 0; index < actual.length; index++)
      difference |= actual[index] ^ expected[index]
    return difference === 0
  } catch {
    return false
  }
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token))
  return encode(new Uint8Array(digest))
}

export function generateSessionToken() {
  return encode(crypto.getRandomValues(new Uint8Array(32)))
}
