import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../templates"

const mocks = vi.hoisted(() => ({
  listWorkoutTemplateSummaries: vi.fn(),
  listActiveExercises: vi.fn(),
}))

vi.mock("@/templates/server-functions", () => ({
  listWorkoutTemplateSummaries: mocks.listWorkoutTemplateSummaries,
}))
vi.mock("@/exercises/server-functions", () => ({
  listActiveExercises: mocks.listActiveExercises,
}))

describe("templates route", () => {
  it("loads templates and the active library together", async () => {
    mocks.listWorkoutTemplateSummaries.mockResolvedValue([{ id: "template" }])
    mocks.listActiveExercises.mockResolvedValue([{ id: "category" }])

    const loader = Route.options.loader as (
      context: unknown
    ) => Promise<unknown>
    await expect(loader({})).resolves.toEqual({
      templates: [{ id: "template" }],
      library: [{ id: "category" }],
    })
    expect(mocks.listWorkoutTemplateSummaries).toHaveBeenCalledOnce()
    expect(mocks.listActiveExercises).toHaveBeenCalledOnce()
  })

  it("renders loading and load-error feedback", () => {
    const Pending = Route.options.pendingComponent as () => ReactNode
    const ErrorComponent = Route.options.errorComponent as () => ReactNode
    const { rerender } = render(<Pending />)
    expect(screen.getByRole("status")).toHaveTextContent("Loading templates")
    rerender(<ErrorComponent />)
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load")
  })
})
