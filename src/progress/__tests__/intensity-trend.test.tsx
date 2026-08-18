import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { IntensityTrend } from "../intensity-trend"

describe("IntensityTrend", () => {
  it("renders chronological accessible daily values matching chart data", () => {
    render(
      <IntensityTrend
        days={[
          { workoutDate: "2026-08-01", scoreMilli: 12_500, workouts: [{ id: "1" } as never] },
          { workoutDate: "2026-08-02", scoreMilli: 20_000, workouts: [{ id: "2" } as never, { id: "3" } as never] },
        ]}
      />
    )
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("2026-08-01")
    expect(rows[1]).toHaveTextContent("12.5")
    expect(rows[2]).toHaveTextContent("2026-08-02")
    expect(rows[2]).toHaveTextContent("20")
    expect(screen.getByText(/relative training trend/i)).toBeInTheDocument()
  })

  it("renders a useful empty state", () => {
    render(<IntensityTrend days={[]} />)
    expect(screen.getByText("No intensity data yet")).toBeInTheDocument()
  })
})
