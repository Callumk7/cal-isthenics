import { and, desc, eq, gte, lt, lte, or } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import { runningWorkouts, workouts } from "../db/schema"
import type { workoutExercises, workoutSets } from "../db/schema"
import {
  calculateRunningMetrics,
  isValidCalendarDate,
} from "../running/running-workouts"

export type HistoryDatabase = DrizzleD1Database<typeof schema>

export type ActivitySummary =
  | {
      type: "calisthenics"
      id: string
      date: string
      createdAt: Date
      name: string | null
      exerciseCount: number
      setCount: number
      repCount: number
    }
  | {
      type: "running"
      id: string
      date: string
      createdAt: Date
      distanceMetres: number
      durationSeconds: number
      calories: number
      calculatedAverageSpeedKmH: number
      effectiveAverageSpeedKmH: number
      overrideActive: boolean
    }

export type ActivityHistoryFilters = {
  from?: unknown
  to?: unknown
  limit?: unknown
  cursor?: unknown
}

export type ActivityHistoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string> }

export type ActivityHistoryPage = {
  items: ActivitySummary[]
  nextCursor: string | null
}

type Cursor = { d: string; c: number; i: string }

const MAX_LIST_LIMIT = 100
export const MAX_HISTORY_RANGE_DAYS = 366

/** Validates the date portion of history filters for both route/UI and server use. */
export function validateActivityHistoryDateFilters(filters: {
  from?: unknown
  to?: unknown
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (filters.from !== undefined && !isValidCalendarDate(filters.from))
    fieldErrors.from = "Enter a valid calendar date."
  if (filters.to !== undefined && !isValidCalendarDate(filters.to))
    fieldErrors.to = "Enter a valid calendar date."
  if (!fieldErrors.from && !fieldErrors.to && filters.from && filters.to) {
    const days =
      (Date.parse(filters.to as string) - Date.parse(filters.from as string)) /
      86_400_000
    if (days < 0) fieldErrors.to = "End date must not precede start date."
    else if (days > MAX_HISTORY_RANGE_DAYS)
      fieldErrors.to = `Date range must be ${MAX_HISTORY_RANGE_DAYS} days or fewer.`
  }
  return fieldErrors
}

function decodeCursor(value: unknown): Cursor | undefined {
  if (typeof value !== "string") return undefined
  try {
    const parsed: unknown = JSON.parse(atob(value))
    if (!parsed || typeof parsed !== "object") return undefined
    const cursor = parsed as {
      v?: unknown
      d?: unknown
      c?: unknown
      i?: unknown
    }
    return cursor.v === 1 &&
      isValidCalendarDate(cursor.d) &&
      typeof cursor.c === "number" &&
      Number.isFinite(cursor.c) &&
      Number.isInteger(cursor.c) &&
      typeof cursor.i === "string" &&
      cursor.i
      ? { d: cursor.d, c: cursor.c, i: cursor.i }
      : undefined
  } catch {
    return undefined
  }
}

function encodeCursor(item: ActivitySummary): string {
  return btoa(
    JSON.stringify({
      v: 1,
      d: item.date,
      c: item.createdAt.valueOf(),
      i: item.id,
    })
  )
}

function compareActivities(
  left: ActivitySummary,
  right: ActivitySummary
): number {
  return (
    right.date.localeCompare(left.date) ||
    right.createdAt.valueOf() - left.createdAt.valueOf() ||
    right.id.localeCompare(left.id)
  )
}

type WorkoutHistoryRow = typeof workouts.$inferSelect & {
  exercises: Array<
    typeof workoutExercises.$inferSelect & {
      sets: Array<typeof workoutSets.$inferSelect>
    }
  >
}

function calisthenicsSummary(row: WorkoutHistoryRow): ActivitySummary {
  const exercises = row.exercises
  return {
    type: "calisthenics",
    id: row.id,
    date: row.workoutDate,
    createdAt: row.createdAt,
    name: row.name,
    exerciseCount: exercises.length,
    setCount: exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0
    ),
    repCount: exercises.reduce(
      (total, exercise) =>
        total + exercise.sets.reduce((reps, set) => reps + set.reps, 0),
      0
    ),
  }
}

function runningSummary(
  row: typeof runningWorkouts.$inferSelect
): ActivitySummary {
  const { calculatedAverageSpeedKmH, effectiveAverageSpeedKmH } =
    calculateRunningMetrics(
      row.distanceMetres,
      row.durationSeconds,
      row.manualSpeedMilliKmH
    )
  return {
    type: "running",
    id: row.id,
    date: row.workoutDate,
    createdAt: row.createdAt,
    distanceMetres: row.distanceMetres,
    durationSeconds: row.durationSeconds,
    calories: row.calories,
    calculatedAverageSpeedKmH,
    effectiveAverageSpeedKmH,
    overrideActive: row.manualSpeedMilliKmH !== null,
  }
}

export async function listActivityHistory(
  db: HistoryDatabase,
  userId: string,
  filters: ActivityHistoryFilters = {}
): Promise<ActivityHistoryResult<ActivityHistoryPage>> {
  const fieldErrors = validateActivityHistoryDateFilters(filters)
  const limit = filters.limit ?? 20
  if (
    typeof limit !== "number" ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIST_LIMIT
  )
    fieldErrors.limit = `Limit must be between 1 and ${MAX_LIST_LIMIT}.`
  const cursor =
    filters.cursor === undefined ? undefined : decodeCursor(filters.cursor)
  if (filters.cursor !== undefined && !cursor)
    fieldErrors.cursor = "Enter a valid continuation cursor."
  if (Object.keys(fieldErrors).length)
    return { ok: false, error: "validation", fieldErrors }

  const pageLimit = limit as number
  const workoutConditions = [eq(workouts.userId, userId)]
  const runningConditions = [eq(runningWorkouts.userId, userId)]
  if (filters.from) {
    workoutConditions.push(gte(workouts.workoutDate, filters.from as string))
    runningConditions.push(
      gte(runningWorkouts.workoutDate, filters.from as string)
    )
  }
  if (filters.to) {
    workoutConditions.push(lte(workouts.workoutDate, filters.to as string))
    runningConditions.push(
      lte(runningWorkouts.workoutDate, filters.to as string)
    )
  }
  if (cursor) {
    const createdAt = new Date(cursor.c)
    workoutConditions.push(
      or(
        lt(workouts.workoutDate, cursor.d),
        and(
          eq(workouts.workoutDate, cursor.d),
          lt(workouts.createdAt, createdAt)
        ),
        and(
          eq(workouts.workoutDate, cursor.d),
          eq(workouts.createdAt, createdAt),
          lt(workouts.id, cursor.i)
        )
      )!
    )
    runningConditions.push(
      or(
        lt(runningWorkouts.workoutDate, cursor.d),
        and(
          eq(runningWorkouts.workoutDate, cursor.d),
          lt(runningWorkouts.createdAt, createdAt)
        ),
        and(
          eq(runningWorkouts.workoutDate, cursor.d),
          eq(runningWorkouts.createdAt, createdAt),
          lt(runningWorkouts.id, cursor.i)
        )
      )!
    )
  }

  // A global top-N item is within its own source's top N, so bounded source
  // fetches followed by this merge are exact while retaining continuation data.
  const [workoutRows, runningRows] = await Promise.all([
    db.query.workouts.findMany({
      where: and(...workoutConditions),
      orderBy: [
        desc(workouts.workoutDate),
        desc(workouts.createdAt),
        desc(workouts.id),
      ],
      limit: pageLimit,
      with: { exercises: { with: { sets: true } } },
    }),
    db.query.runningWorkouts.findMany({
      where: and(...runningConditions),
      orderBy: [
        desc(runningWorkouts.workoutDate),
        desc(runningWorkouts.createdAt),
        desc(runningWorkouts.id),
      ],
      limit: pageLimit,
    }),
  ])
  const merged = [
    ...(workoutRows as WorkoutHistoryRow[]).map(calisthenicsSummary),
    ...runningRows.map(runningSummary),
  ].sort(compareActivities)
  const items = merged.slice(0, pageLimit)
  return {
    ok: true,
    value: {
      items,
      nextCursor:
        merged.length > pageLimit ||
        workoutRows.length === pageLimit ||
        runningRows.length === pageLimit
          ? encodeCursor(items[items.length - 1])
          : null,
    },
  }
}
