import { and, asc, eq, gte, lte } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import { runningWorkouts } from "../db/schema"
import { isValidCalendarDate } from "../lib/date"

export type RunningTrendDatabase = DrizzleD1Database<typeof schema>

export type RunningTrendDay = {
  workoutDate: string
  distanceKm: number
  durationSeconds: number
  relativeIntensity: number
  runCount: number
}

type RunningTrendRow = Pick<
  typeof runningWorkouts.$inferSelect,
  "workoutDate" | "distanceMetres" | "durationSeconds"
> &
  Partial<
    Pick<
      typeof runningWorkouts.$inferSelect,
      "manualSpeedMilliKmH" | "calories"
    >
  >

function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

/** Builds exact chronological calendar-day points, including empty days. */
export function aggregateRunningTrends(
  rows: RunningTrendRow[],
  range: { from: string; to: string }
): RunningTrendDay[] {
  if (
    !isValidCalendarDate(range.from) ||
    !isValidCalendarDate(range.to) ||
    range.from > range.to
  )
    throw new Error("Invalid running trend date range.")

  const totals = new Map<string, RunningTrendDay>()
  for (const row of rows) {
    if (row.workoutDate < range.from || row.workoutDate > range.to) continue
    const day = totals.get(row.workoutDate) ?? {
      workoutDate: row.workoutDate,
      distanceKm: 0,
      durationSeconds: 0,
      relativeIntensity: 0,
      runCount: 0,
    }
    const distanceKm = row.distanceMetres / 1000
    day.distanceKm += distanceKm
    day.durationSeconds += row.durationSeconds
    // This is intentionally based on calculated speed. Manual speed and
    // calories are not inputs to this deterministic relative score.
    day.relativeIntensity +=
      (distanceKm * distanceKm * 3600) / row.durationSeconds
    day.runCount += 1
    totals.set(row.workoutDate, day)
  }

  const days: RunningTrendDay[] = []
  for (let date = range.from; date <= range.to; date = nextDate(date))
    days.push(
      totals.get(date) ?? {
        workoutDate: date,
        distanceKm: 0,
        durationSeconds: 0,
        relativeIntensity: 0,
        runCount: 0,
      }
    )
  return days
}

export async function listRunningTrends(
  db: RunningTrendDatabase,
  userId: string,
  range: { from: string; to: string }
) {
  const rows = await db.query.runningWorkouts.findMany({
    where: and(
      eq(runningWorkouts.userId, userId),
      gte(runningWorkouts.workoutDate, range.from),
      lte(runningWorkouts.workoutDate, range.to)
    ),
    orderBy: [asc(runningWorkouts.workoutDate), asc(runningWorkouts.createdAt)],
  })
  return aggregateRunningTrends(rows, range)
}

export function formatTrendValue(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
}
