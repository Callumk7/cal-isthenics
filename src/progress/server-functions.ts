import { createServerFn } from "@tanstack/react-start"

import { requireCurrentSession } from "../auth/current-session"
import { db } from "../db/client"
import { listCalisthenicsIntensity as listIntensity } from "./calisthenics-intensity"
import { listRunningTrends as listRunningTrendsOp } from "./running-trends"

export const listCalisthenicsIntensity = createServerFn({ method: "GET" })
  .validator((range: { from: string; to: string }) => range)
  .handler(async ({ data }) => {
    const session = await requireCurrentSession()
    return listIntensity(db, session.userId, data)
  })

export const listRunningTrends = createServerFn({ method: "GET" })
  .validator((range: { from: string; to: string }) => range)
  .handler(async ({ data }) => {
    const session = await requireCurrentSession()
    return listRunningTrendsOp(db, session.userId, data)
  })
