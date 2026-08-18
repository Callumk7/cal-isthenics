const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * True when `value` is a real calendar date in ISO format (YYYY-MM-DD).
 * Used by both the client form and the server domain layer so the two
 * validate dates identically.
 */
export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

/**
 * Today's date in the application's local-calendar convention (YYYY-MM-DD),
 * independent of the host's UTC offset.
 */
export function localCalendarToday() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}
