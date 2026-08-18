import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../progress"

vi.mock("@/progress/server-functions", () => ({
  listCalisthenicsIntensity: vi.fn().mockResolvedValue([]),
}))

describe("progress route", () => {
  it("provides loading and failure feedback", () => {
    const Pending = Route.options.pendingComponent as () => ReactNode
    const ErrorComponent = Route.options.errorComponent as () => ReactNode
    const { rerender } = render(<Pending />)
    expect(screen.getByRole("status")).toHaveTextContent("Loading intensity trend")
    rerender(<ErrorComponent />)
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load")
  })
})
