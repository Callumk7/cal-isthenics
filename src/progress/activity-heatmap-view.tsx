import type { ActivityHeatmapDay } from "./activity-heatmap"

const levelStyles = [
  "bg-muted text-muted-foreground",
  "bg-primary/20 text-foreground",
  "bg-primary/40 text-foreground",
  "bg-primary/70 text-primary-foreground",
  "bg-primary text-primary-foreground",
]

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
  timeZone: "UTC",
})

function summary(day: ActivityHeatmapDay) {
  const date = dateFormatter.format(new Date(`${day.date}T00:00:00Z`))
  return `${date}: relative activity intensity level ${day.level} of 4 (${Math.round(day.score * 100)}%). ${day.workoutCount} calisthenics ${day.workoutCount === 1 ? "workout" : "workouts"}, calisthenics relative value ${Math.round(day.calisthenicsRelative * 100)}%. ${day.runCount} ${day.runCount === 1 ? "run" : "runs"}, ${day.runningDistanceKm.toFixed(2)} km, running relative value ${Math.round(day.runningRelative * 100)}%.`
}

export function ActivityHeatmap({ days }: { days: ActivityHeatmapDay[] }) {
  const startWeekday = days[0]
    ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay()
    : 0
  const monthLabels = days
    .map((day, index) => ({
      day,
      index,
      column: Math.floor((index + startWeekday) / 7),
    }))
    .filter(
      ({ day, index }) =>
        index === 0 || day.date.slice(5, 7) !== days[index - 1].date.slice(5, 7)
    )

  return (
    <section aria-labelledby="activity-heatmap-title" className="space-y-4">
      <div>
        <h2 id="activity-heatmap-title" className="text-xl font-semibold">
          Daily activity
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Relative activity intensity across calisthenics and running. Each
          activity type is normalized independently within these 365 days.
        </p>
      </div>
      <div
        className="max-w-full overflow-x-auto rounded-xl border bg-card p-4"
        data-testid="heatmap-scroll-region"
      >
        <div className="min-w-[53rem]">
          <div
            className="relative ml-10 h-6 text-xs text-muted-foreground"
            aria-hidden="true"
          >
            {monthLabels.map(({ day, column }) => (
              <span
                key={day.date}
                className="absolute"
                style={{ left: `${column}rem` }}
              >
                {new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(`${day.date}T00:00:00Z`))}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <div
              className="grid w-8 grid-rows-7 gap-1 text-right text-[10px] leading-4 text-muted-foreground"
              aria-hidden="true"
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (weekday) => (
                  <span key={weekday}>{weekday[0]}</span>
                )
              )}
            </div>
            <div
              role="grid"
              aria-label="365-day relative activity intensity"
              className="grid grid-flow-col grid-rows-7 gap-1"
            >
              {Array.from({ length: startWeekday }, (_, index) => (
                <span key={`blank-${index}`} aria-hidden="true" />
              ))}
              {days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  role="gridcell"
                  aria-label={summary(day)}
                  title={summary(day)}
                  className={`size-3.5 rounded-[3px] text-[8px] leading-none font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${levelStyles[day.level]}`}
                >
                  {day.level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        aria-label="Relative activity intensity legend"
      >
        <span>Less activity</span>
        {levelStyles.map((style, level) => (
          <span
            key={level}
            className={`inline-flex size-5 items-center justify-center rounded text-[10px] font-bold ${style}`}
          >
            {level}
            <span className="sr-only">Level {level}</span>
          </span>
        ))}
        <span>More activity</span>
      </div>
    </section>
  )
}
