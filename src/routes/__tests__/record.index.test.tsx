import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../record.index"

const mocks = vi.hoisted(() => ({
  listWorkoutTemplateSummaries: vi.fn(),
  listActiveExercises: vi.fn(),
  listWorkouts: vi.fn(),
  listRunningWorkouts: vi.fn(),
}))

vi.mock("@/templates/server-functions", () => ({
  listWorkoutTemplateSummaries: mocks.listWorkoutTemplateSummaries,
}))
vi.mock("@/exercises/server-functions", () => ({
  listActiveExercises: mocks.listActiveExercises,
}))
vi.mock("@/workouts/server-functions", () => ({
  listWorkouts: mocks.listWorkouts,
}))
vi.mock("@/running/server-functions", () => ({
  listRunningWorkouts: mocks.listRunningWorkouts,
}))

describe("record index route", () => {
  it("loads templates, the active library, and recent workouts together", async () => {
    mocks.listWorkoutTemplateSummaries.mockResolvedValue([{ id: "template" }])
    mocks.listActiveExercises.mockResolvedValue([{ id: "category" }])
    mocks.listWorkouts.mockResolvedValue([])
    mocks.listRunningWorkouts.mockResolvedValue({ ok: true, value: [] })

    const loader = Route.options.loader as (
      context: unknown
    ) => Promise<unknown>
    await expect(loader({})).resolves.toEqual({
      templates: [{ id: "template" }],
      library: [{ id: "category" }],
      workouts: [],
      workoutsFailed: false,
      runs: [],
      runsFailed: false,
    })
    expect(mocks.listWorkoutTemplateSummaries).toHaveBeenCalledOnce()
    expect(mocks.listActiveExercises).toHaveBeenCalledOnce()
    expect(mocks.listWorkouts).toHaveBeenCalledOnce()
    expect(mocks.listRunningWorkouts).toHaveBeenCalledOnce()
  })

  it("keeps starter data available when either discovery request fails", async () => {
    mocks.listWorkoutTemplateSummaries.mockResolvedValue([{ id: "template" }])
    mocks.listActiveExercises.mockResolvedValue([{ id: "category" }])
    mocks.listWorkouts.mockRejectedValue(new Error("offline"))
    mocks.listRunningWorkouts.mockRejectedValue(new Error("offline"))

    const loader = Route.options.loader as (
      context: unknown
    ) => Promise<unknown>
    await expect(loader({})).resolves.toEqual({
      templates: [{ id: "template" }],
      library: [{ id: "category" }],
      workouts: [],
      workoutsFailed: true,
      runs: [],
      runsFailed: true,
    })
  })

  it("renders loading and load-error feedback", () => {
    const Pending = Route.options.pendingComponent as () => ReactNode
    const ErrorComponent = Route.options.errorComponent as () => ReactNode
    const { rerender } = render(<Pending />)
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading workout recorder"
    )
    rerender(<ErrorComponent />)
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load")
  })
})
