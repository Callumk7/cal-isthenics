import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { buildActivityHeatmap } from "../activity-heatmap"
import { ActivityHeatmap } from "../activity-heatmap-view"

describe("ActivityHeatmap", () => {
  it("provides grid semantics, non-color levels, summaries, legend, and controlled overflow", () => {
    const days = buildActivityHeatmap([], [], {
      from: "2026-01-01",
      to: "2026-12-31",
    })
    render(<ActivityHeatmap days={days} />)
    expect(screen.getByRole("grid", { name: /365-day/ })).toBeInTheDocument()
    expect(screen.getAllByRole("gridcell")).toHaveLength(365)
    expect(
      screen.getByRole("gridcell", {
        name: /January 1, 2026.*level 0 of 4.*0 runs/,
      })
    ).toHaveTextContent("0")
    expect(
      screen.getByLabelText("Relative activity intensity legend")
    ).toHaveTextContent("Less activity")
    expect(screen.getByTestId("heatmap-scroll-region")).toHaveClass(
      "overflow-x-auto",
      "max-w-full"
    )
  })
})
