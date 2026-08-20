import { RouterLink } from "@/components/ui/router-link"
import type { ActivityHeatmapDay } from "./activity-heatmap"

const levelStyles = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
]

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
})

function summary(day: ActivityHeatmapDay) {
  const date = dateFormatter.format(new Date(`${day.date}T00:00:00Z`))
  return `${date}: relative activity intensity level ${day.level} of 4 (${Math.round(day.score * 100)}%). ${day.workoutCount} calisthenics ${day.workoutCount === 1 ? "workout" : "workouts"}, calisthenics relative value ${Math.round(day.calisthenicsRelative * 100)}%. ${day.runCount} ${day.runCount === 1 ? "run" : "runs"}, ${day.runningDistanceKm.toFixed(2)} km, running relative value ${Math.round(day.runningRelative * 100)}%.`
}

function hasActivity(day: ActivityHeatmapDay) {
  return day.workoutCount > 0 || day.runCount > 0
}

export function ActivityHeatmap({ days }: { days: ActivityHeatmapDay[] }) {
  const startWeekday = days[0]
    ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay()
    : 0
  const weekCount = Math.max(1, Math.ceil((days.length + startWeekday) / 7))
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
    <section
      aria-labelledby="activity-heatmap-title"
      className="min-w-0 space-y-4"
    >
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
        className="w-full min-w-0 overflow-hidden rounded-xl border bg-card p-3 sm:p-4"
        data-testid="heatmap-region"
      >
        <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2">
          <div />
          <div
            className="grid h-6 gap-px text-[9px] text-muted-foreground sm:gap-1 sm:text-xs"
            style={{
              gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
            }}
            aria-hidden="true"
          >
            {monthLabels.map(({ day, column }) => (
              <span key={day.date} style={{ gridColumnStart: column + 1 }}>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(`${day.date}T00:00:00Z`))}
              </span>
            ))}
          </div>
          <div
            className="grid grid-rows-7 items-center text-[9px] text-muted-foreground"
            aria-hidden="true"
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => (
              <span key={`${weekday}-${index}`}>{weekday}</span>
            ))}
          </div>
          <div
            role="grid"
            aria-label="365-day relative activity intensity"
            className="grid min-w-0 grid-flow-col grid-rows-7 gap-px sm:gap-1"
            style={{
              gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: startWeekday }, (_, index) => (
              <span
                key={`blank-${index}`}
                aria-hidden="true"
                className="aspect-square min-w-0"
              />
            ))}
            {days.map((day) => {
              const label = summary(day)
              const active = hasActivity(day)
              const cellClassName = `aspect-square min-w-0 rounded-[2px] sm:rounded-[3px] ${levelStyles[day.level]}`

              return (
                <span
                  key={day.date}
                  role="gridcell"
                  aria-label={label}
                  title={label}
                  className={cellClassName}
                >
                  {active && (
                    <RouterLink
                      to="/history"
                      search={{ from: day.date, to: day.date }}
                      aria-label={`View ${label} in History`}
                      className="block size-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  )}
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <details className="rounded-xl border bg-card p-3">
        <summary className="cursor-pointer text-sm font-medium">
          View daily activity data as a table
        </summary>
        <div
          role="region"
          aria-label="Daily activity data table"
          tabIndex={0}
          className="mt-3 overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
        >
          <table className="w-full min-w-[42rem] text-left text-sm">
            <caption className="sr-only">
              Daily relative activity intensity, calisthenics workouts, and runs
            </caption>
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Level</th>
                <th className="px-3 py-2 text-right font-medium">
                  Calisthenics workouts
                </th>
                <th className="px-3 py-2 text-right font-medium">Runs</th>
                <th className="px-3 py-2 text-right font-medium">
                  Running distance (km)
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <time dateTime={day.date}>{day.date}</time>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {day.level} of 4
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {day.workoutCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {day.runCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {day.runningDistanceKm.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        aria-label="Relative activity intensity legend"
      >
        <span>Less activity</span>
        {levelStyles.map((style, level) => (
          <span
            key={level}
            aria-label={`Level ${level}`}
            className={`inline-block size-4 rounded ${style}`}
          />
        ))}
        <span>More activity</span>
      </div>
    </section>
  )
}
