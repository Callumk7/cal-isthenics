import { and, desc, eq, gte, lte } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import { runningWorkouts } from "../db/schema"

export type RunningDatabase = DrizzleD1Database<typeof schema>
export type RunningWorkoutInput = {
  workoutDate: unknown
  distanceKm: unknown
  durationSeconds: unknown
  calories: unknown
  manualSpeedKmH?: unknown
}
export type RunningWorkout = typeof runningWorkouts.$inferSelect & {
  calculatedAverageSpeedKmH: number
  effectiveAverageSpeedKmH: number
  runningIntensity: number
}
export type RunningResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      error: "validation" | "not_found"
      fieldErrors?: Record<string, string>
    }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/
const MAX_LIST_LIMIT = 100
const MAX_RANGE_DAYS = 366

export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

function parsePositiveDecimalThousandths(
  value: unknown,
  message: string
): { value: number } | { error: string } {
  const text =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : ""
  if (!DECIMAL_PATTERN.test(text)) return { error: message }
  const [whole, fraction = ""] = text.split(".")
  const parsed = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"))
  return Number.isSafeInteger(parsed) && parsed > 0
    ? { value: parsed }
    : { error: message }
}

export function parseDistanceKm(
  value: unknown
): { value: number } | { error: string } {
  const parsed = parsePositiveDecimalThousandths(
    value,
    "Enter a positive distance in kilometres with up to three decimal places."
  )
  return "value" in parsed ? { value: parsed.value } : parsed
}

export function parseManualSpeedKmH(
  value: unknown
): { value: number | null } | { error: string } {
  if (value === undefined || value === null || value === "")
    return { value: null }
  return parsePositiveDecimalThousandths(
    value,
    "Enter a positive speed in km/h with up to three decimal places."
  )
}

function parsePositiveInteger(
  value: unknown,
  message: string
): { value: number } | { error: string } {
  const text =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : ""
  if (!/^\d+$/.test(text)) return { error: message }
  const parsed = Number(text)
  return Number.isSafeInteger(parsed) && parsed > 0
    ? { value: parsed }
    : { error: message }
}

export function calculateRunningMetrics(
  distanceMetres: number,
  durationSeconds: number,
  manualSpeedMilliKmH: number | null
) {
  const calculatedAverageSpeedKmH = (distanceMetres * 3.6) / durationSeconds
  return {
    calculatedAverageSpeedKmH,
    effectiveAverageSpeedKmH:
      manualSpeedMilliKmH === null
        ? calculatedAverageSpeedKmH
        : manualSpeedMilliKmH / 1000,
    runningIntensity: (distanceMetres / 1000) * calculatedAverageSpeedKmH,
  }
}

function enrich(row: typeof runningWorkouts.$inferSelect): RunningWorkout {
  return {
    ...row,
    ...calculateRunningMetrics(
      row.distanceMetres,
      row.durationSeconds,
      row.manualSpeedMilliKmH
    ),
  }
}

function validateInput(input: RunningWorkoutInput) {
  const fieldErrors: Record<string, string> = {}
  if (!isValidCalendarDate(input.workoutDate))
    fieldErrors.workoutDate = "Enter a valid calendar date."
  const distance = parseDistanceKm(input.distanceKm)
  const duration = parsePositiveInteger(
    input.durationSeconds,
    "Enter a positive whole number of seconds."
  )
  const calories = parsePositiveInteger(
    input.calories,
    "Enter positive whole-number calories."
  )
  const speed = parseManualSpeedKmH(input.manualSpeedKmH)
  if ("error" in distance) fieldErrors.distanceKm = distance.error
  if ("error" in duration) fieldErrors.durationSeconds = duration.error
  if ("error" in calories) fieldErrors.calories = calories.error
  if ("error" in speed) fieldErrors.manualSpeedKmH = speed.error
  if (
    Object.keys(fieldErrors).length ||
    !("value" in distance) ||
    !("value" in duration) ||
    !("value" in calories) ||
    !("value" in speed)
  )
    return { error: fieldErrors }
  return {
    value: {
      workoutDate: input.workoutDate as string,
      distanceMetres: distance.value,
      durationSeconds: duration.value,
      calories: calories.value,
      manualSpeedMilliKmH: speed.value,
    },
  }
}

export async function createRunningWorkout(
  db: RunningDatabase,
  userId: string,
  input: RunningWorkoutInput,
  now = new Date()
): Promise<RunningResult<RunningWorkout>> {
  const parsed = validateInput(input)
  if ("error" in parsed)
    return { ok: false, error: "validation", fieldErrors: parsed.error }
  const row = {
    id: crypto.randomUUID(),
    userId,
    ...parsed.value,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(runningWorkouts).values(row)
  return { ok: true, value: enrich(row) }
}

export async function getRunningWorkout(
  db: RunningDatabase,
  userId: string,
  id: string
): Promise<RunningWorkout | undefined> {
  const row = await db.query.runningWorkouts.findFirst({
    where: and(eq(runningWorkouts.id, id), eq(runningWorkouts.userId, userId)),
  })
  return row && enrich(row)
}

export async function updateRunningWorkout(
  db: RunningDatabase,
  userId: string,
  input: RunningWorkoutInput & { id: string },
  now = new Date()
): Promise<RunningResult<RunningWorkout>> {
  const parsed = validateInput(input)
  if ("error" in parsed)
    return { ok: false, error: "validation", fieldErrors: parsed.error }
  const updated = await db
    .update(runningWorkouts)
    .set({ ...parsed.value, updatedAt: now })
    .where(
      and(eq(runningWorkouts.id, input.id), eq(runningWorkouts.userId, userId))
    )
    .returning()
    .all()
  return updated[0]
    ? { ok: true, value: enrich(updated[0]) }
    : { ok: false, error: "not_found" }
}

export async function deleteRunningWorkout(
  db: RunningDatabase,
  userId: string,
  id: string
): Promise<RunningResult<{ id: string }>> {
  const deleted = await db
    .delete(runningWorkouts)
    .where(and(eq(runningWorkouts.id, id), eq(runningWorkouts.userId, userId)))
    .returning({ id: runningWorkouts.id })
    .all()
  return deleted[0]
    ? { ok: true, value: { id: deleted[0].id } }
    : { ok: false, error: "not_found" }
}

export async function listRunningWorkouts(
  db: RunningDatabase,
  userId: string,
  filters: { from?: unknown; to?: unknown; limit?: unknown } = {}
): Promise<RunningResult<RunningWorkout[]>> {
  const fieldErrors: Record<string, string> = {}
  if (filters.from !== undefined && !isValidCalendarDate(filters.from))
    fieldErrors.from = "Enter a valid calendar date."
  if (filters.to !== undefined && !isValidCalendarDate(filters.to))
    fieldErrors.to = "Enter a valid calendar date."
  const limit = filters.limit ?? 20
  if (
    typeof limit !== "number" ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIST_LIMIT
  )
    fieldErrors.limit = `Limit must be between 1 and ${MAX_LIST_LIMIT}.`
  if (!fieldErrors.from && !fieldErrors.to && filters.from && filters.to) {
    const days =
      (Date.parse(filters.to as string) - Date.parse(filters.from as string)) /
      86_400_000
    if (days < 0) fieldErrors.to = "End date must not precede start date."
    else if (days > MAX_RANGE_DAYS)
      fieldErrors.to = `Date range must be ${MAX_RANGE_DAYS} days or fewer.`
  }
  if (Object.keys(fieldErrors).length)
    return { ok: false, error: "validation", fieldErrors }
  const conditions = [eq(runningWorkouts.userId, userId)]
  if (filters.from)
    conditions.push(gte(runningWorkouts.workoutDate, filters.from as string))
  if (filters.to)
    conditions.push(lte(runningWorkouts.workoutDate, filters.to as string))
  const rows = await db.query.runningWorkouts.findMany({
    where: and(...conditions),
    orderBy: [
      desc(runningWorkouts.workoutDate),
      desc(runningWorkouts.createdAt),
      desc(runningWorkouts.id),
    ],
    limit: limit as number,
  })
  return { ok: true, value: rows.map(enrich) }
}
