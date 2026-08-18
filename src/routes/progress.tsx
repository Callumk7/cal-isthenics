import { createFileRoute } from "@tanstack/react-router"
import { IntensityTrend } from "@/progress/intensity-trend"
import { trailingTwelveMonthRange } from "@/progress/calisthenics-intensity"
import {
  listCalisthenicsIntensity,
  listRunningTrends,
} from "@/progress/server-functions"
import { RunningTrends } from "@/progress/running-trends-view"

export const Route = createFileRoute("/progress")({
  loader: async () => {
    const range = trailingTwelveMonthRange()
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
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary">Trailing 12 months</p>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      </div>
      <RunningTrends days={running} />
      <IntensityTrend days={calisthenics} />
    </main>
  )
}
