import { ActivityIcon } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { CalisthenicsIntensityDay } from "./calisthenics-intensity"
import { formatRelativeScore } from "./calisthenics-intensity"

export function IntensityTrend({ days }: { days: CalisthenicsIntensityDay[] }) {
  if (!days.length)
    return (
      <section className="rounded-xl border border-dashed p-8 text-center">
        <ActivityIcon
          className="mx-auto mb-3 size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="font-semibold">No intensity data yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a calisthenics workout to start your relative training trend.
        </p>
      </section>
    )

  const chartData = days.map((day) => ({
    date: day.workoutDate,
    score: day.scoreMilli / 1000,
  }))
  return (
    <section aria-labelledby="intensity-title" className="space-y-6">
      <div>
        <h2 id="intensity-title" className="text-xl font-semibold">
          Calisthenics intensity
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A relative training trend based on reps and exercise difficulty. Use
          it to compare your training over time.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3 sm:p-6" aria-hidden="true">
        <ChartContainer
          config={{
            score: { label: "Relative score", color: "var(--primary)" },
          }}
          className="min-h-64 w-full"
        >
          <LineChart
            data={chartData}
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
            <YAxis tickLine={false} axisLine={false} width={42} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="date"
                  formatter={(value) => (
                    <span>
                      Relative score{" "}
                      <strong>
                        {Number(value).toLocaleString(undefined, {
                          maximumFractionDigits: 3,
                        })}
                      </strong>
                    </span>
                  )}
                />
              }
            />
            <Line
              dataKey="score"
              type="monotone"
              stroke="var(--color-score)"
              strokeWidth={2}
              dot={days.length === 1}
            />
          </LineChart>
        </ChartContainer>
      </div>
      <div
        role="region"
        aria-label="Scrollable daily calisthenics intensity data"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border focus-visible:outline-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[30rem] text-left text-sm">
          <caption className="sr-only">
            Calisthenics intensity daily values in chronological order
          </caption>
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">
                Relative score
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.workoutDate} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {day.workouts.length > 0 ? (
                    <a
                      href={`/history?from=${day.workoutDate}&to=${day.workoutDate}`}
                      aria-label={`View calisthenics activity for ${day.workoutDate} in History`}
                      className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <time dateTime={day.workoutDate}>{day.workoutDate}</time>
                    </a>
                  ) : (
                    <time dateTime={day.workoutDate}>{day.workoutDate}</time>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {day.workouts.length}{" "}
                    {day.workouts.length === 1 ? "workout" : "workouts"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatRelativeScore(day.scoreMilli)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
