import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ActivitySummary } from "@/history/activity-history"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { routeTree } from "../../routeTree.gen"
import { Route as HistoryRoute } from "../../routes/history"
import { HistoryPage } from "../history-page"

const mocks = vi.hoisted(() => ({
  listActivityHistory: vi.fn(),
  getAuthState: vi.fn(),
  logout: vi.fn(),
}))

vi.mock("@/history/server-functions", () => ({
  listActivityHistory: mocks.listActivityHistory,
}))
vi.mock("@/auth/server-functions", () => ({
  getAuthState: mocks.getAuthState,
  logout: mocks.logout,
}))
vi.mock("@/components/ui/router-link", () => ({
  RouterLink: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
  }) => (
    <a
      href={to
        .replace("$workoutId", params?.workoutId ?? "")
        .replace("$runId", params?.runId ?? "")}
      {...props}
    >
      {children}
    </a>
  ),
}))

const workout = (
  id: string,
  date = "2026-08-18"
): Extract<ActivitySummary, { type: "calisthenics" }> => ({
  type: "calisthenics",
  id,
  date,
  createdAt: new Date("2026-08-18T12:00:00Z"),
  name: "Push day",
  exerciseCount: 3,
  setCount: 15,
  repCount: 120,
})

const run = (
  id: string,
  date = "2026-08-17",
  overrideActive = false
): Extract<ActivitySummary, { type: "running" }> => ({
  type: "running",
  id,
  date,
  createdAt: new Date("2026-08-17T12:00:00Z"),
  distanceMetres: 5000,
  durationSeconds: 1830,
  calories: 300,
  calculatedAverageSpeedKmH: 9.84,
  effectiveAverageSpeedKmH: overrideActive ? 10.5 : 9.84,
  overrideActive,
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe("HistoryPage", () => {
  it("renders mixed activity types in newest date order", () => {
    render(
      <HistoryPage
        initialItems={[workout("w1"), run("r1")]}
        initialNextCursor={null}
      />
    )

    expect(screen.getByRole("link", { name: /push day/i })).toHaveAttribute(
      "href",
      "/record/w1"
    )
    expect(screen.getByRole("link", { name: /^run/i })).toHaveAttribute(
      "href",
      "/record/run/r1"
    )
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual(["18 Aug 2026", "17 Aug 2026"])
    expect(
      screen.getByText("3 exercises · 15 sets · 120 reps")
    ).toBeInTheDocument()
    expect(screen.getByText("5.00 km · 30 min · 300 kcal")).toBeInTheDocument()
    expect(screen.getByText("9.84 km/h")).toBeInTheDocument()
    expect(screen.queryByText("Manual")).not.toBeInTheDocument()
    expect(screen.getByText("Edit workout")).toBeInTheDocument()
    expect(screen.getByText("Edit run")).toBeInTheDocument()
  })

  it("groups same-date activities and keeps their arrival order", () => {
    render(
      <HistoryPage
        initialItems={[workout("w1"), workout("w2"), run("r1", "2026-08-18")]}
        initialNextCursor={null}
      />
    )

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1)
    const list = screen.getByRole("list")
    expect(list.querySelectorAll("li")).toHaveLength(3)
    expect(
      [...list.querySelectorAll("a")].map((link) => link.getAttribute("href"))
    ).toEqual(["/record/w1", "/record/w2", "/record/run/r1"])
  })

  it("presents manual speed accessibly and omits it for calculated speed", () => {
    render(
      <HistoryPage
        initialItems={[run("manual", "2026-08-18", true), run("calculated")]}
        initialNextCursor={null}
      />
    )

    expect(screen.getByText("10.50 km/h")).toBeInTheDocument()
    expect(screen.getByText("Manual")).toBeInTheDocument()
    expect(
      screen.getByText(/calculated average speed 9.84 km\/h/i)
    ).toHaveClass("sr-only")
    expect(screen.getAllByText("9.84 km/h")).toHaveLength(1)
  })

  it("falls back to Workout for unnamed calisthenics", () => {
    render(
      <HistoryPage
        initialItems={[{ ...workout("unnamed"), name: null }]}
        initialNextCursor={null}
      />
    )
    expect(screen.getByRole("link", { name: /workout/i })).toHaveAttribute(
      "href",
      "/record/unnamed"
    )
  })

  it("loads more across date boundaries and deduplicates activities", async () => {
    mocks.listActivityHistory.mockResolvedValue({
      ok: true,
      value: {
        items: [workout("w1"), run("r2", "2026-08-16")],
        nextCursor: null,
      },
    })
    render(
      <HistoryPage
        initialItems={[workout("w1"), run("r1")]}
        initialNextCursor="cursor"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    await waitFor(() =>
      expect(mocks.listActivityHistory).toHaveBeenCalledWith({
        data: { cursor: "cursor" },
      })
    )
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("link", { name: /run/i })
          .some((link) => link.getAttribute("href") === "/record/run/r2")
      ).toBe(true)
    )
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual(["18 Aug 2026", "17 Aug 2026", "16 Aug 2026"])
    expect(screen.getAllByRole("link", { name: /push day/i })).toHaveLength(1)
    expect(
      screen.queryByRole("button", { name: "Load more" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("End of history")).toBeInTheDocument()
  })

  it("keeps prior history and allows retry after load-more failure", async () => {
    mocks.listActivityHistory
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        value: { items: [run("r2")], nextCursor: null },
      })
    render(
      <HistoryPage initialItems={[workout("w1")]} initialNextCursor="cursor" />
    )

    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("couldn't load more")
    )
    expect(screen.getByRole("link", { name: /push day/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Load more" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /^run/i })).toHaveAttribute(
        "href",
        "/record/run/r2"
      )
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows an empty state when history is exhausted", () => {
    render(<HistoryPage initialItems={[]} initialNextCursor={null} />)
    expect(
      screen.getByRole("heading", { name: /no workouts or runs yet/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Completed workouts and runs will appear here.")
    ).toBeInTheDocument()
  })

  it("keeps content full-width and long names wrapping", () => {
    render(
      <HistoryPage initialItems={[workout("w1")]} initialNextCursor={null} />
    )
    expect(screen.getByTestId("history-page")).toHaveClass(
      "max-w-3xl",
      "w-full"
    )
    expect(screen.getByText("Push day")).toHaveClass("break-words")
  })

  it("treats a failed initial history result as a loader error", async () => {
    mocks.listActivityHistory.mockResolvedValue({
      ok: false,
      error: "validation",
      fieldErrors: {},
    })
    const loader = HistoryRoute.options.loader as () => Promise<unknown>

    await expect(loader()).rejects.toThrow("Unable to load history")
  })

  it("mounts the history route in the real router", async () => {
    mocks.getAuthState.mockResolvedValue({
      authenticated: true,
      userId: "user",
    })
    mocks.listActivityHistory.mockResolvedValue({
      ok: true,
      value: { items: [workout("w1")], nextCursor: null },
    })
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/history"] }),
      defaultPreload: false,
    })
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole("link", { name: /push day/i })
    ).toHaveAttribute("href", "/record/w1")
    expect(mocks.listActivityHistory).toHaveBeenCalledWith()
  })

  it("shows the initial loader error and retries the first page", async () => {
    mocks.getAuthState.mockResolvedValue({
      authenticated: true,
      userId: "user",
    })
    mocks.listActivityHistory
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        value: { items: [workout("w1")], nextCursor: null },
      })
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/history"] }),
      defaultPreload: false,
    })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn't load your history"
    )
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(
      await screen.findByRole("link", { name: /push day/i })
    ).toHaveAttribute("href", "/record/w1")
    expect(mocks.listActivityHistory).toHaveBeenCalledTimes(2)
  })
})
