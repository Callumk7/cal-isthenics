import { spawnSync } from "node:child_process"
import { webcrypto } from "node:crypto"

const remote = process.argv.includes("--remote")
const invalidArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--remote" && argument !== "--local")
if (invalidArguments.length) {
  console.error("Usage: pnpm auth:provision [--local|--remote]")
  process.exit(1)
}

let password = process.env.CAL_PASSWORD
if (!password && !process.stdin.isTTY) {
  password = await new Promise((resolve, reject) => {
    let input = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => (input += chunk))
    process.stdin.on("end", () => resolve(input.replace(/[\r\n]+$/, "")))
    process.stdin.on("error", reject)
  })
}
if (!password) {
  console.error(
    "Supply the password on standard input or in the temporary CAL_PASSWORD environment variable."
  )
  process.exit(1)
}

const encoder = new TextEncoder()
const salt = webcrypto.getRandomValues(new Uint8Array(16))
// Keep in sync with src/auth/crypto.ts and workerd's PBKDF2 limit.
const iterations = 100_000
const key = await webcrypto.subtle.importKey(
  "raw",
  encoder.encode(password),
  "PBKDF2",
  false,
  ["deriveBits"]
)
const derived = await webcrypto.subtle.deriveBits(
  { name: "PBKDF2", hash: "SHA-256", salt, iterations },
  key,
  256
)
const encode = (bytes) => Buffer.from(bytes).toString("base64")
const passwordHash = `pbkdf2-sha256$${iterations}$${encode(salt)}$${encode(derived)}`
const now = Date.now()
const sql = [
  "DELETE FROM sessions WHERE user_id = 'owner';",
  `INSERT INTO users (id, password_hash, created_at, updated_at) VALUES ('owner', '${passwordHash}', ${now}, ${now}) ` +
    `ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at;`,
].join(" ")

password = undefined
delete process.env.CAL_PASSWORD
const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  [
    "exec",
    "wrangler",
    "d1",
    "execute",
    "cal-isthenics-db",
    remote ? "--remote" : "--local",
    "--command",
    sql,
  ],
  { stdio: "inherit" }
)
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
console.log(
  `Provisioned the owner account in ${remote ? "production" : "local D1"}; existing sessions were revoked.`
)
