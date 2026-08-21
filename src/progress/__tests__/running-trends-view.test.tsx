import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RunningTrends } from "../running-trends-view"

vi.mock("@/components/ui/router-link", () => ({
  RouterLink: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string
    search?: { from?: string; to?: string }
    children?: React.ReactNode
  }) => (
    <a href={`${to}?from=${search?.from}&to=${search?.to}`} {...props}>
      {children}
    </a>
  ),
}))

describe("RunningTrends", () => {
  it("keeps metrics separate and provides the chart values as accessible text", () => {
    render(
      <RunningTrends
        days={[
          {
            workoutDate: "2026-08-01",
            distanceKm: 5,
            durationSeconds: 1800,
            relativeIntensity: 50,
            runCount: 1,
          },
          {
            workoutDate: "2026-08-02",
            distanceKm: 0,
            durationSeconds: 0,
            relativeIntensity: 0,
            runCount: 0,
          },
        ]}
      />
    )
    expect(
      screen.getByRole("heading", { name: "Daily distance (km)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /relative trend score/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not a physiological measurement/i)
    ).toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("2026-08-01")
    expect(rows[1]).toHaveTextContent("5.00")
    expect(rows[1]).toHaveTextContent("00:30:00")
    expect(rows[1]).toHaveTextContent("50.00")
    expect(rows).toHaveLength(2)
    expect(
      screen.getByRole("region", { name: "Scrollable daily running data" })
    ).toHaveAttribute("tabindex", "0")
    expect(screen.queryByText("0 runs")).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", {
        name: "View running activity for 2026-08-01 in History",
      })
    ).toHaveAttribute("href", "/history?from=2026-08-01&to=2026-08-01")
    expect(
      screen.queryByRole("link", {
        name: "View running activity for 2026-08-02 in History",
      })
    ).not.toBeInTheDocument()
  })

  it("renders an empty state when the range contains no runs", () => {
    render(
      <RunningTrends
        days={[
          {
            workoutDate: "2026-08-01",
            distanceKm: 0,
            durationSeconds: 0,
            relativeIntensity: 0,
            runCount: 0,
          },
        ]}
      />
    )
    expect(screen.getByText("No running trend data yet")).toBeInTheDocument()
  })
})
