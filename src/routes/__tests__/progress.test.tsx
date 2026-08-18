import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { trailingTwelveMonthRange } from "@/progress/calisthenics-intensity"
import { Route } from "../progress"

const mocks = vi.hoisted(() => ({
  listCalisthenicsIntensity: vi.fn(),
}))

vi.mock("@/progress/server-functions", () => ({
  listCalisthenicsIntensity: mocks.listCalisthenicsIntensity,
}))

describe("progress route", () => {
  it("loads the trailing 12-month intensity trend", async () => {
    mocks.listCalisthenicsIntensity.mockResolvedValue([])
    const loader = Route.options.loader as () => Promise<unknown>
    await expect(loader()).resolves.toEqual([])
    expect(mocks.listCalisthenicsIntensity).toHaveBeenCalledWith({
      data: trailingTwelveMonthRange(),
    })
  })

  it("provides loading and failure feedback", () => {
    const Pending = Route.options.pendingComponent as () => ReactNode
    const ErrorComponent = Route.options.errorComponent as () => ReactNode
    const { rerender } = render(<Pending />)
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading intensity trend"
    )
    rerender(<ErrorComponent />)
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load")
  })
})
