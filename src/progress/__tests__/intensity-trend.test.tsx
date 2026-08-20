import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { IntensityTrend } from "../intensity-trend"

describe("IntensityTrend", () => {
  it("renders chronological accessible daily values matching chart data", () => {
    render(
      <IntensityTrend
        days={[
          {
            workoutDate: "2026-08-01",
            scoreMilli: 12_500,
            workouts: [{ id: "1" } as never],
          },
          {
            workoutDate: "2026-08-02",
            scoreMilli: 20_000,
            workouts: [{ id: "2" } as never, { id: "3" } as never],
          },
          {
            workoutDate: "2026-08-03",
            scoreMilli: 0,
            workouts: [],
          },
        ]}
      />
    )
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("2026-08-01")
    expect(rows[1]).toHaveTextContent("12.5")
    expect(rows[2]).toHaveTextContent("2026-08-02")
    expect(rows[2]).toHaveTextContent("20")
    expect(rows[3]).toHaveTextContent("2026-08-03")
    expect(screen.getByText(/relative training trend/i)).toBeInTheDocument()
    expect(
      screen.getByRole("region", {
        name: "Scrollable daily calisthenics intensity data",
      })
    ).toHaveAttribute("tabindex", "0")
    expect(
      screen.getByRole("link", {
        name: "View calisthenics activity for 2026-08-01 in History",
      })
    ).toHaveAttribute("href", "/history?from=2026-08-01&to=2026-08-01")
    expect(
      screen.queryByRole("link", {
        name: "View calisthenics activity for 2026-08-03 in History",
      })
    ).not.toBeInTheDocument()
  })

  it("renders a useful empty state", () => {
    render(<IntensityTrend days={[]} />)
    expect(screen.getByText("No intensity data yet")).toBeInTheDocument()
  })
})
