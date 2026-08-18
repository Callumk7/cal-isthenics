import { createFileRoute } from "@tanstack/react-router"
import { IntensityTrend } from "@/progress/intensity-trend"
import { trailingTwelveMonthRange } from "@/progress/calisthenics-intensity"
import { listCalisthenicsIntensity } from "@/progress/server-functions"

export const Route = createFileRoute("/progress")({
  loader: () => listCalisthenicsIntensity({ data: trailingTwelveMonthRange() }),
  pendingComponent: () => (
    <main className="mx-auto max-w-5xl p-4 md:p-8" role="status">
      Loading intensity trend…
    </main>
  ),
  errorComponent: () => (
    <main className="mx-auto max-w-5xl p-4 md:p-8" role="alert">
      We couldn't load your intensity trend. Refresh the page to try again.
    </main>
  ),
  component: ProgressPage,
})
function ProgressPage() {
  const days = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary">Trailing 12 months</p>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      </div>
      <IntensityTrend days={days} />
    </main>
  )
}
