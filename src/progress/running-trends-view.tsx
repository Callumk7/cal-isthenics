import { ActivityIcon, RouteIcon } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { RunningTrendDay } from "./running-trends"
import { formatDuration, formatTrendValue } from "./running-trends"

function TrendChart({
  days,
  metric,
  label,
  color,
}: {
  days: RunningTrendDay[]
  metric: "distanceKm" | "relativeIntensity"
  label: string
  color: string
}) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-6" aria-hidden="true">
      <ChartContainer
        config={{ value: { label, color } }}
        className="min-h-56 w-full"
      >
        <LineChart
          data={days.map((day) => ({
            date: day.workoutDate,
            value: day[metric],
          }))}
          margin={{ left: 4, right: 12, top: 12 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelKey="date"
                formatter={(value) =>
                  `${label}: ${formatTrendValue(Number(value))}`
                }
              />
            }
          />
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={days.length === 1}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}

export function RunningTrends({ days }: { days: RunningTrendDay[] }) {
  const activeDays = days.filter((day) => day.runCount > 0)
  if (!activeDays.length)
    return (
      <section className="rounded-xl border border-dashed p-8 text-center">
        <RouteIcon
          className="mx-auto mb-3 size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="font-semibold">No running trend data yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a run in this date range to see distance and relative
          intensity.
        </p>
      </section>
    )

  return (
    <section aria-labelledby="running-trends-title" className="space-y-8">
      <div>
        <h2 id="running-trends-title" className="text-xl font-semibold">
          Running trends
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Distance and relative trend score are separate metrics. The score is a
          deterministic comparison based only on each run&apos;s distance and
          duration; it is not a physiological measurement.
        </p>
      </div>

      <section aria-labelledby="distance-title" className="space-y-3">
        <h3 id="distance-title" className="font-semibold">
          Daily distance (km)
        </h3>
        <TrendChart
          days={activeDays}
          metric="distanceKm"
          label="Distance (km)"
          color="var(--chart-1)"
        />
      </section>
      <section aria-labelledby="run-intensity-title" className="space-y-3">
        <h3
          id="run-intensity-title"
          className="flex items-center gap-2 font-semibold"
        >
          <ActivityIcon className="size-4" aria-hidden="true" /> Relative trend
          score
        </h3>
        <TrendChart
          days={activeDays}
          metric="relativeIntensity"
          label="Relative trend score"
          color="var(--chart-2)"
        />
      </section>

      <div
        role="region"
        aria-label="Scrollable daily running data"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border focus-visible:outline-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">
            Daily running distance, duration context, and relative trend score
            in chronological order
          </caption>
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">
                Distance (km)
              </th>
              <th className="px-4 py-3 text-right font-medium">Duration</th>
              <th className="px-4 py-3 text-right font-medium">
                Relative trend score
              </th>
            </tr>
          </thead>
          <tbody>
            {activeDays.map((day) => (
              <tr key={day.workoutDate} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {day.runCount > 0 ? (
                    <a
                      href={`/history?from=${day.workoutDate}&to=${day.workoutDate}`}
                      aria-label={`View running activity for ${day.workoutDate} in History`}
                      className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <time dateTime={day.workoutDate}>{day.workoutDate}</time>
                    </a>
                  ) : (
                    <time dateTime={day.workoutDate}>{day.workoutDate}</time>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {day.runCount} {day.runCount === 1 ? "run" : "runs"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatTrendValue(day.distanceKm)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatDuration(day.durationSeconds)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatTrendValue(day.relativeIntensity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
