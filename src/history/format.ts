const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export function formatDistanceKm(metres: number): string {
  return (metres / 1000).toFixed(2)
}

export function formatDurationSeconds(seconds: number): string {
  const total = Math.round(seconds)
  if (total < 60) return `${total} sec`
  if (total < 3600) return `${Math.floor(total / 60)} min`
  return `${Math.floor(total / 3600)} h ${Math.floor((total % 3600) / 60)} min`
}

export function formatSpeedKmH(kmh: number): string {
  return kmh.toFixed(2)
}

export function formatDateHeading(date: string): string {
  const parts = date.split("-")
  if (parts.length !== 3) return date

  const [yearPart, monthPart, dayPart] = parts
  if (
    !/^\d{4}$/.test(yearPart) ||
    !/^\d{2}$/.test(monthPart) ||
    !/^\d{2}$/.test(dayPart)
  )
    return date

  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1])
    return date

  return `${day} ${monthNames[month - 1]} ${year}`
}
