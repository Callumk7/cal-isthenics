import { describe, expect, it } from "vitest"

import { createInMemoryD1 } from "@/test/in-memory-d1"

describe("createInMemoryD1", () => {
  it("keeps each factory result's rows and reset operation isolated", () => {
    const first = createInMemoryD1()
    const second = createInMemoryD1()

    first.seed("users", { id: "first" })
    second.seed("users", { id: "second" })
    first.reset()

    expect(first._tables.users.rows).toEqual([])
    expect(second._tables.users.rows).toEqual([{ id: "second" }])
  })
})
