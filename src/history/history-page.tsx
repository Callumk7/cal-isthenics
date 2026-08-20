import { useEffect, useRef, useState } from "react"
import { HistoryIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ActivitySummary } from "@/history/activity-history"
import { validateActivityHistoryDateFilters } from "@/history/activity-history"
import {
  formatDateHeading,
  formatDistanceKm,
  formatDurationSeconds,
  formatSpeedKmH,
} from "@/history/format"
import { listActivityHistory } from "@/history/server-functions"

type HistoryFilters = { from?: string; to?: string }

type HistoryPageProps = {
  initialItems: ActivitySummary[]
  initialNextCursor: string | null
  filters?: HistoryFilters
  initialFieldErrors?: Record<string, string>
  initialRequestError?: boolean
  onApplyFilters?: (filters: HistoryFilters) => void
}

type ActivityGroup = {
  date: string
  items: ActivitySummary[]
}

const EMPTY_FIELD_ERRORS: Record<string, string> = {}

function pluralize(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

function groupActivities(items: ActivitySummary[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>()
  for (const item of items) {
    const group = groups.get(item.date)
    if (group) group.items.push(item)
    else groups.set(item.date, { date: item.date, items: [item] })
  }
  return [...groups.values()]
}

function appendUniqueActivities(
  existingItems: ActivitySummary[],
  newItems: ActivitySummary[]
): ActivitySummary[] {
  const keys = new Set(existingItems.map((item) => `${item.type}:${item.id}`))
  return [
    ...existingItems,
    ...newItems.filter((item) => {
      const key = `${item.type}:${item.id}`
      if (keys.has(key)) return false
      keys.add(key)
      return true
    }),
  ]
}

export function HistoryPage({
  initialItems,
  initialNextCursor,
  filters = {},
  initialFieldErrors = EMPTY_FIELD_ERRORS,
  initialRequestError = false,
  onApplyFilters,
}: HistoryPageProps) {
  const [items, setItems] = useState(initialItems)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [from, setFrom] = useState(filters.from ?? "")
  const [to, setTo] = useState(filters.to ?? "")
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors)
  const [requestError, setRequestError] = useState(initialRequestError)
  const [hasSuccessfulTimeline, setHasSuccessfulTimeline] = useState(
    !initialRequestError && Object.keys(initialFieldErrors).length === 0
  )
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const paginationInFlight = useRef(false)
  const groups = groupActivities(items)

  // Route loader results are authoritative. A failed filter request deliberately
  // leaves the prior successful timeline in place so it remains recoverable.
  useEffect(() => {
    setFrom(filters.from ?? "")
    setTo(filters.to ?? "")
    setFieldErrors(initialFieldErrors)
    setRequestError(initialRequestError)
    if (initialRequestError || Object.keys(initialFieldErrors).length > 0) {
      setAnnouncement(
        initialRequestError
          ? "We couldn't filter history. Please try again."
          : "Fix the date filter errors and try again."
      )
      return
    }
    setItems(initialItems)
    setNextCursor(initialNextCursor)
    setLoadError(false)
    setHasSuccessfulTimeline(true)
    setAnnouncement(
      initialItems.length === 0
        ? "No activities found for this date range."
        : `Filtered history. ${pluralize(initialItems.length, "activity")} loaded.`
    )
  }, [
    filters.from,
    filters.to,
    initialFieldErrors,
    initialItems,
    initialNextCursor,
    initialRequestError,
  ])

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextFilters = { from: from || undefined, to: to || undefined }
    const errors = validateActivityHistoryDateFilters(nextFilters)
    setFieldErrors(errors)
    setRequestError(false)
    if (Object.keys(errors).length > 0) {
      setAnnouncement("Fix the date filter errors and try again.")
      return
    }
    setAnnouncement("Filtering history.")
    onApplyFilters?.(nextFilters)
  }

  function clearFilters() {
    setFrom("")
    setTo("")
    setFieldErrors({})
    setRequestError(false)
    setAnnouncement("Filtering history.")
    onApplyFilters?.({})
  }

  async function loadMore() {
    if (!nextCursor || paginationInFlight.current) return

    paginationInFlight.current = true
    setLoadingMore(true)
    setLoadError(false)
    try {
      const result = await listActivityHistory({
        data: { ...filters, cursor: nextCursor },
      })
      if (!result.ok) throw new Error("Unable to load history")

      const appendedCount = result.value.items.filter(
        (item) =>
          !items.some(
            (current) => current.type === item.type && current.id === item.id
          )
      ).length
      setItems((currentItems) =>
        appendUniqueActivities(currentItems, result.value.items)
      )
      setNextCursor(result.value.nextCursor)
      setAnnouncement(
        `Loaded ${appendedCount} more ${appendedCount === 1 ? "activity" : "activities"}.`
      )
    } catch {
      setLoadError(true)
      setAnnouncement("We couldn't load more history. Please try again.")
    } finally {
      paginationInFlight.current = false
      setLoadingMore(false)
    }
  }

  const hasFilterError = Object.keys(fieldErrors).length > 0 || requestError
  const showEmpty =
    hasSuccessfulTimeline && items.length === 0 && nextCursor === null

  return (
    <div
      data-testid="history-page"
      className="mx-auto w-full max-w-3xl p-4 md:p-8"
    >
      <h1 className="text-2xl font-semibold">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review your completed workouts and runs.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <form className="mt-6 border p-4" onSubmit={applyFilters} noValidate>
        <fieldset>
          <legend className="font-medium">Filter by date</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm" htmlFor="history-from">
              From
              <Input
                id="history-from"
                className="mt-1 h-11"
                type="date"
                value={from}
                aria-invalid={Boolean(fieldErrors.from)}
                aria-describedby={
                  fieldErrors.from ? "history-from-error" : undefined
                }
                onChange={(event) => setFrom(event.target.value)}
              />
              {fieldErrors.from && (
                <span
                  id="history-from-error"
                  className="mt-1 block text-destructive"
                >
                  {fieldErrors.from}
                </span>
              )}
            </label>
            <label className="text-sm" htmlFor="history-to">
              To
              <Input
                id="history-to"
                className="mt-1 h-11"
                type="date"
                value={to}
                aria-invalid={Boolean(fieldErrors.to)}
                aria-describedby={
                  fieldErrors.to ? "history-to-error" : undefined
                }
                onChange={(event) => setTo(event.target.value)}
              />
              {fieldErrors.to && (
                <span
                  id="history-to-error"
                  className="mt-1 block text-destructive"
                >
                  {fieldErrors.to}
                </span>
              )}
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">Apply filters</Button>
            {(from || to) && (
              <Button type="button" variant="outline" onPress={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </fieldset>
        {requestError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            We couldn't filter history. Please try again.
          </p>
        )}
      </form>

      {hasFilterError && !hasSuccessfulTimeline ? null : showEmpty ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <HistoryIcon className="size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">
            {filters.from || filters.to
              ? "No activities match these dates"
              : "No workouts or runs yet"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.from || filters.to
              ? "Try changing or clearing the date filters."
              : "Completed workouts and runs will appear here."}
          </p>
        </div>
      ) : hasSuccessfulTimeline ? (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <section
              key={group.date}
              aria-labelledby={`date-${group.date}`}
              className="w-full"
            >
              <h2 id={`date-${group.date}`} className="text-lg font-medium">
                {formatDateHeading(group.date)}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={`${item.type}:${item.id}`} className="w-full">
                    {item.type === "calisthenics" ? (
                      <LinkButton
                        variant="outline"
                        to="/record/$workoutId"
                        params={{ workoutId: item.id } as never}
                        className="h-auto w-full justify-between p-3"
                      >
                        <span className="min-w-0 text-left">
                          <span className="block font-medium break-words">
                            {item.name || "Workout"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {pluralize(item.exerciseCount, "exercise")} ·{" "}
                            {pluralize(item.setCount, "set")} ·{" "}
                            {pluralize(item.repCount, "rep")}
                          </span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          Edit workout
                        </span>
                      </LinkButton>
                    ) : (
                      <LinkButton
                        variant="outline"
                        to="/record/run/$runId"
                        params={{ runId: item.id } as never}
                        className="h-auto w-full justify-between p-3"
                      >
                        <span className="min-w-0 text-left">
                          <span className="block font-medium break-words">
                            Run
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDistanceKm(item.distanceMetres)} km ·{" "}
                            {formatDurationSeconds(item.durationSeconds)} ·{" "}
                            {item.calories} kcal
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatSpeedKmH(item.effectiveAverageSpeedKmH)} km/h
                            {item.overrideActive && (
                              <>
                                {" "}
                                <Badge variant="outline">Manual</Badge>
                                <span className="sr-only">
                                  Calculated average speed{" "}
                                  {formatSpeedKmH(
                                    item.calculatedAverageSpeedKmH
                                  )}{" "}
                                  km/h.
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          Edit run
                        </span>
                      </LinkButton>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {loadError && (
            <p role="alert">We couldn't load more history. Please try again.</p>
          )}
          {nextCursor !== null ? (
            <Button
              className="h-11 w-full"
              isDisabled={loadingMore}
              onPress={loadMore}
            >
              {loadingMore ? "Loading more…" : "Load more"}
            </Button>
          ) : items.length > 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              End of history
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
