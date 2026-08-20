import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { trailing365DayRange } from "@/progress/activity-heatmap"
import { Route } from "../progress"

const mocks = vi.hoisted(() => ({
  localCalendarToday: vi.fn(() => "2026-04-10"),
  listCalisthenicsIntensity: vi.fn(),
  listRunningTrends: vi.fn(),
}))

vi.mock("@/lib/date", () => ({
  localCalendarToday: mocks.localCalendarToday,
}))

vi.mock("@/progress/server-functions", () => ({
  listCalisthenicsIntensity: mocks.listCalisthenicsIntensity,
  listRunningTrends: mocks.listRunningTrends,
}))

vi.mock("@/components/ui/router-link", () => ({
  RouterLink: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string
    search?: { from?: string; to?: string }
    children?: ReactNode
  }) => (
    <a href={`${to}?from=${search?.from}&to=${search?.to}`} {...props}>
      {children}
    </a>
  ),
}))

describe("progress route", () => {
  it("loads and returns one exact trailing 365-day range", async () => {
    mocks.listCalisthenicsIntensity.mockResolvedValue([])
    mocks.listRunningTrends.mockResolvedValue([])
    const loader = Route.options.loader as () => Promise<{
      range: { from: string; to: string }
      calisthenics: []
      running: []
    }>
    const result = await loader()
    const expectedRange = trailing365DayRange("2026-04-10")

    expect(result).toEqual({
      range: expectedRange,
      calisthenics: [],
      running: [],
    })
    expect(mocks.localCalendarToday).toHaveBeenCalledOnce()
    expect(mocks.listCalisthenicsIntensity).toHaveBeenCalledWith({
      data: expectedRange,
    })
    expect(mocks.listRunningTrends).toHaveBeenCalledWith({
      data: expectedRange,
    })
    expect(mocks.listCalisthenicsIntensity.mock.calls[0][0].data).toBe(
      result.range
    )
    expect(mocks.listRunningTrends.mock.calls[0][0].data).toBe(result.range)
  })

  it("uses the loader range for the heatmap and accurately labels the window", () => {
    vi.spyOn(Route, "useLoaderData").mockReturnValue({
      range: { from: "2026-01-01", to: "2026-01-02" },
      calisthenics: [
        {
          workoutDate: "2026-01-02",
          scoreMilli: 100,
          workouts: [{ id: "workout" }],
        },
      ],
      running: [
        {
          workoutDate: "2026-01-02",
          distanceKm: 5,
          durationSeconds: 1800,
          relativeIntensity: 50,
          runCount: 1,
        },
      ],
    })
    const Component = Route.options.component as () => ReactNode

    render(<>{Component()}</>)

    expect(screen.getByText("Trailing 365 days")).toBeInTheDocument()
    expect(screen.getAllByRole("gridcell")).toHaveLength(2)
    expect(
      screen.getByRole("gridcell", { name: /January 1, 2026/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", {
        name: "View calisthenics activity for 2026-01-02 in History",
      })
    ).toHaveAttribute("href", "/history?from=2026-01-02&to=2026-01-02")
    expect(
      screen.getByRole("link", {
        name: "View running activity for 2026-01-02 in History",
      })
    ).toHaveAttribute("href", "/history?from=2026-01-02&to=2026-01-02")
  })

  it("provides loading and failure feedback", () => {
    const Pending = Route.options.pendingComponent as () => ReactNode
    const ErrorComponent = Route.options.errorComponent as () => ReactNode
    const { rerender } = render(<Pending />)
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading progress trends"
    )
    rerender(<ErrorComponent />)
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load")
  })
})
