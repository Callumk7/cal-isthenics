import { createFileRoute, useRouter } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { HistoryPage } from "@/history/history-page"
import { listActivityHistory } from "@/history/server-functions"

export const Route = createFileRoute("/history")({
  loader: async () => {
    const result = await listActivityHistory()
    return result.ok
      ? { items: result.value.items, nextCursor: result.value.nextCursor }
      : { items: [], nextCursor: null }
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="status">
      Loading history…
    </div>
  ),
  errorComponent: HistoryLoadError,
  component: HistoryRoutePage,
})

function HistoryLoadError() {
  const router = useRouter()
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="alert">
      <p>We couldn't load your history.</p>
      <Button className="mt-3" onPress={() => router.invalidate()}>
        Try again
      </Button>
    </div>
  )
}

function HistoryRoutePage() {
  const data = Route.useLoaderData()
  return (
    <HistoryPage
      initialItems={data.items}
      initialNextCursor={data.nextCursor}
    />
  )
}
