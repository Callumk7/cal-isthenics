import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { buildActivityHeatmap } from "../activity-heatmap"
import { ActivityHeatmap } from "../activity-heatmap-view"

describe("ActivityHeatmap", () => {
  it("provides grid semantics and summaries without rendering level numbers", () => {
    const days = buildActivityHeatmap([], [], {
      from: "2026-01-01",
      to: "2026-12-31",
    })
    render(<ActivityHeatmap days={days} />)
    expect(screen.getByRole("grid", { name: /365-day/ })).toBeInTheDocument()
    expect(screen.getAllByRole("gridcell")).toHaveLength(365)
    const firstCell = screen.getByRole("gridcell", {
      name: /January 1, 2026.*level 0 of 4.*0 runs/,
    })
    expect(firstCell).toBeEmptyDOMElement()
    expect(firstCell.tagName).toBe("SPAN")
    expect(firstCell).not.toHaveAttribute("tabindex")
    expect(firstCell).toHaveAttribute(
      "title",
      firstCell.getAttribute("aria-label")
    )
    expect(
      screen.getByLabelText("Relative activity intensity legend")
    ).toHaveTextContent("Less activity")
    expect(screen.getByTestId("heatmap-region")).toHaveClass(
      "w-full",
      "min-w-0",
      "overflow-hidden"
    )
    expect(screen.getByRole("grid", { name: /365-day/ })).toHaveStyle({
      gridTemplateColumns: "repeat(53, minmax(0, 1fr))",
    })
  })

  it("links active cells to their exact-date History records but leaves empty cells noninteractive", () => {
    const days = buildActivityHeatmap(
      [
        {
          workoutDate: "2026-01-02",
          scoreMilli: 100,
          workouts: [{ id: "workout" } as never],
        },
      ],
      [],
      { from: "2026-01-01", to: "2026-01-02" }
    )
    render(<ActivityHeatmap days={days} />)

    expect(
      screen.getByRole("link", {
        name: /January 2, 2026.*calisthenics.*History/i,
      })
    ).toHaveAttribute("href", "/history?from=2026-01-02&to=2026-01-02")
    expect(
      screen.getByRole("gridcell", { name: /January 1, 2026/ })
    ).not.toContainElement(screen.queryByRole("link"))
  })

  it("offers a keyboard-accessible daily-data alternative to the visual grid", () => {
    const days = buildActivityHeatmap([], [], {
      from: "2026-01-01",
      to: "2026-01-02",
    })
    render(<ActivityHeatmap days={days} />)

    expect(
      screen.getByRole("region", { name: "Daily activity data table" })
    ).toHaveAttribute("tabindex", "0")
    expect(
      screen.getByText("View daily activity data as a table")
    ).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(3)
  })

  it("positions month labels against the responsive grid width", () => {
    const days = buildActivityHeatmap([], [], {
      from: "2026-01-01",
      to: "2026-12-31",
    })
    render(<ActivityHeatmap days={days} />)

    // January 1 is Thursday, so February 1 begins in the sixth grid column.
    expect(screen.getByText("Feb")).toHaveStyle({ gridColumnStart: "6" })
  })
})
