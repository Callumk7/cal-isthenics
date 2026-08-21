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
    return { range, calisthenics, running }
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-5xl p-4 md:p-8" role="status">
      Loading progress trends…
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-5xl p-4 md:p-8" role="alert">
      We couldn't load your progress trends. Refresh the page to try again.
    </div>
  ),
  component: ProgressPage,
})
function ProgressPage() {
  const { range, calisthenics, running } = Route.useLoaderData()
  const heatmapDays = buildActivityHeatmap(calisthenics, running, range)
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary">Trailing 365 days</p>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      </div>
      <ActivityHeatmap days={heatmapDays} />
      <RunningTrends days={running} />
      <IntensityTrend days={calisthenics} />
    </div>
  )
}
