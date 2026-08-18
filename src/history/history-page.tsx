import { useState } from "react"
import { HistoryIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
import type { ActivitySummary } from "@/history/activity-history"
import {
  formatDateHeading,
  formatDistanceKm,
  formatDurationSeconds,
  formatSpeedKmH,
} from "@/history/format"
import { listActivityHistory } from "@/history/server-functions"

type HistoryPageProps = {
  initialItems: ActivitySummary[]
  initialNextCursor: string | null
}

type ActivityGroup = {
  date: string
  items: ActivitySummary[]
}

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
}: HistoryPageProps) {
  const [items, setItems] = useState(initialItems)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const groups = groupActivities(items)

  async function loadMore() {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    setLoadError(false)
    try {
      const result = await listActivityHistory({ data: { cursor: nextCursor } })
      if (!result.ok) throw new Error("Unable to load history")

      setItems((currentItems) =>
        appendUniqueActivities(currentItems, result.value.items)
      )
      setNextCursor(result.value.nextCursor)
      setAnnouncement("Loaded more history.")
    } catch {
      setLoadError(true)
      setAnnouncement("We couldn't load more history. Please try again.")
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <h1 className="text-2xl font-semibold">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review your completed workouts and runs.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {items.length === 0 && nextCursor === null ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <HistoryIcon className="size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No workouts or runs yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed workouts and runs will appear here.
          </p>
        </div>
      ) : (
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
                          View
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
                          Edit
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
      )}
    </main>
  )
}
