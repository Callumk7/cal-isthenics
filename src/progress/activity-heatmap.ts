import type { CalisthenicsIntensityDay } from "./calisthenics-intensity"
import type { RunningTrendDay } from "./running-trends"

export type ActivityHeatmapDay = {
  date: string
  level: 0 | 1 | 2 | 3 | 4
  score: number
  calisthenicsRelative: number
  runningRelative: number
  calisthenicsIntensity: number
  workoutCount: number
  runningIntensity: number
  runCount: number
  runningDistanceKm: number
}

function shiftCalendarDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

/** Exactly 365 calendar dates ending on `today`, without local/UTC conversion. */
export function trailing365DayRange(today: string) {
  return { from: shiftCalendarDate(today, -364), to: today }
}

export function buildActivityHeatmap(
  calisthenics: CalisthenicsIntensityDay[],
  running: RunningTrendDay[],
  range: { from: string; to: string }
): ActivityHeatmapDay[] {
  const calisthenicsByDate = new Map(
    calisthenics.map((day) => [day.workoutDate, day])
  )
  const runningByDate = new Map(running.map((day) => [day.workoutDate, day]))
  const visibleCalisthenics = calisthenics.filter(
    (day) => day.workoutDate >= range.from && day.workoutDate <= range.to
  )
  const visibleRunning = running.filter(
    (day) => day.workoutDate >= range.from && day.workoutDate <= range.to
  )
  const calisthenicsMaximum = Math.max(
    0,
    ...visibleCalisthenics.map((day) => day.scoreMilli)
  )
  const runningMaximum = Math.max(
    0,
    ...visibleRunning.map((day) => day.relativeIntensity)
  )
  const modalityCount =
    Number(calisthenicsMaximum > 0) + Number(runningMaximum > 0)

  const days: ActivityHeatmapDay[] = []
  for (
    let date = range.from;
    date <= range.to;
    date = shiftCalendarDate(date, 1)
  ) {
    const calisthenicsDay = calisthenicsByDate.get(date)
    const runningDay = runningByDate.get(date)
    const calisthenicsIntensity = calisthenicsDay?.scoreMilli ?? 0
    const runningIntensity = runningDay?.relativeIntensity ?? 0
    const calisthenicsRelative = calisthenicsMaximum
      ? calisthenicsIntensity / calisthenicsMaximum
      : 0
    const runningRelative = runningMaximum
      ? runningIntensity / runningMaximum
      : 0
    const score = modalityCount
      ? (calisthenicsRelative + runningRelative) / modalityCount
      : 0
    days.push({
      date,
      level:
        score === 0 ? 0 : (Math.min(4, Math.ceil(score * 4)) as 1 | 2 | 3 | 4),
      score,
      calisthenicsRelative,
      runningRelative,
      calisthenicsIntensity,
      workoutCount: calisthenicsDay?.workouts.length ?? 0,
      runningIntensity,
      runCount: runningDay?.runCount ?? 0,
      runningDistanceKm: runningDay?.distanceKm ?? 0,
    })
  }
  return days
}
