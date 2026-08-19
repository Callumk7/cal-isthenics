import { createFileRoute } from "@tanstack/react-router"
import { IntensityTrend } from "@/progress/intensity-trend"
import {
  listCalisthenicsIntensity,
  listRunningTrends,
} from "@/progress/server-functions"
import { RunningTrends } from "@/progress/running-trends-view"
import { localCalendarToday } from "@/lib/date"
import {
  buildActivityHeatmap,
  trailing365DayRange,
} from "@/progress/activity-heatmap"
import { ActivityHeatmap } from "@/progress/activity-heatmap-view"

export const Route = createFileRoute("/progress")({
  loader: async () => {
    const range = trailing365DayRange(localCalendarToday())
    const [calisthenics, running] = await Promise.all([
      listCalisthenicsIntensity({ data: range }),
      listRunningTrends({ data: range }),
    ])
    return { calisthenics, running }
  },
  pendingComponent: () => (
    <main className="mx-auto max-w-5xl p-4 md:p-8" role="status">
      Loading progress trends…
    </main>
  ),
  errorComponent: () => (
    <main className="mx-auto max-w-5xl p-4 md:p-8" role="alert">
      We couldn't load your progress trends. Refresh the page to try again.
    </main>
  ),
  component: ProgressPage,
})
function ProgressPage() {
  const { calisthenics, running } = Route.useLoaderData()
  const heatmapDays = buildActivityHeatmap(
    calisthenics,
    running,
    trailing365DayRange(localCalendarToday())
  )
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary">Trailing 12 months</p>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      </div>
      <ActivityHeatmap days={heatmapDays} />
      <RunningTrends days={running} />
      <IntensityTrend days={calisthenics} />
    </main>
  )
}
