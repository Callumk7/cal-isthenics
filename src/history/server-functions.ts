import { createServerFn } from "@tanstack/react-start"

import { requireCurrentSession } from "../auth/current-session"
import { db } from "../db/client"
import { listActivityHistory as listActivityHistoryOp } from "./activity-history"
import type { ActivityHistoryFilters } from "./activity-history"

async function userId() {
  return (await requireCurrentSession()).userId
}

export const listActivityHistory = createServerFn({ method: "GET" })
  .validator((input: ActivityHistoryFilters = {}) => input)
  .handler(async ({ data }) => listActivityHistoryOp(db, await userId(), data))
