import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { HistoryPage } from "@/history/history-page"
import { listActivityHistory } from "@/history/server-functions"

type HistorySearch = { from?: string; to?: string }

export const Route = createFileRoute("/history")({
  validateSearch: (search: Record<string, unknown>): HistorySearch => ({
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  loader: async ({ location }) => {
    const filters = location.search as HistorySearch
    let result
    try {
      result =
        filters.from || filters.to
          ? await listActivityHistory({ data: filters })
          : await listActivityHistory()
    } catch {
      // The first page retains the established route-level recovery UI. A
      // subsequent date-filter failure is returned to the mounted page, which
      // can keep its already successful timeline visible.
      if (!filters.from && !filters.to)
        throw new Error("Unable to load history")
      return {
        filters,
        items: [],
        nextCursor: null,
        fieldErrors: {},
        requestError: true,
      }
    }
    if (!result.ok) {
      if (!filters.from && !filters.to)
        throw new Error("Unable to load history")
      return {
        filters,
        items: [],
        nextCursor: null,
        fieldErrors: result.fieldErrors,
        requestError: false,
      }
    }
    return {
      filters,
      items: result.value.items,
      nextCursor: result.value.nextCursor,
      fieldErrors: {},
      requestError: false,
    }
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
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <HistoryPage
      initialItems={data.items}
      initialNextCursor={data.nextCursor}
      filters={data.filters}
      initialFieldErrors={data.fieldErrors}
      initialRequestError={data.requestError}
      onApplyFilters={(filters) => navigate({ search: filters })}
    />
  )
}
