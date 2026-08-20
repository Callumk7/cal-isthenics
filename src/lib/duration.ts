const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

/**
 * Converts a native time-input value (HH:MM or HH:MM:SS) to total seconds.
 * Returns null for malformed values or a zero duration.
 */
export function parseDuration(value: string) {
  if (!TIME_PATTERN.test(value)) return null
  const [hours, minutes, seconds = "0"] = value.split(":")
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  return total > 0 ? total : null
}

/** Formats seconds as the second-precision value required by a time input. */
export function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600)
  const minutes = Math.floor((durationSeconds % 3600) / 60)
  const seconds = durationSeconds % 60
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
}
