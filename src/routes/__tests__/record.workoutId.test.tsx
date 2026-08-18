import { render, screen } from "@testing-library/react"
import { isRedirect } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../record.$workoutId"

const mocks = vi.hoisted(() => ({
  readWorkout: vi.fn(),
  listActiveExercises: vi.fn(),
}))

vi.mock("@/workouts/server-functions", () => ({
  readWorkout: mocks.readWorkout,
}))
vi.mock("@/exercises/server-functions", () => ({
  listActiveExercises: mocks.listActiveExercises,
}))

const workout = {
  id: "workout-1",
  userId: "user",
  workoutDate: "2026-08-18",
  name: "Push day",
  notes: "Felt strong",
  createdAt: new Date(),
  updatedAt: new Date(),
  exercises: [
    {
      id: "ex-1",
      workoutId: "workout-1",
      sourceVariantId: "push-up",
      position: 0,
      categoryName: "Push",
      variantName: "Push-up",
      difficultyMultiplier: 1,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sets: [
        {
          id: "set-1",
          workoutExerciseId: "ex-1",
          position: 0,
          reps: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ],
}

describe("record.$workoutId route", () => {
  it("loads the workout detail and the active library for the edit form", async () => {
    mocks.readWorkout.mockResolvedValue(workout)
    mocks.listActiveExercises.mockResolvedValue([{ id: "category" }])

    const loader = Route.options.loader as (ctx: unknown) => Promise<unknown>
    await expect(
      loader({ params: { workoutId: "workout-1" } })
    ).resolves.toEqual({ workout, library: [{ id: "category" }] })
    expect(mocks.readWorkout).toHaveBeenCalledWith({
      data: { id: "workout-1" },
    })
    expect(mocks.listActiveExercises).toHaveBeenCalledOnce()
  })

  it("redirects to /record when the workout is not found", async () => {
    mocks.readWorkout.mockResolvedValue(undefined)
    mocks.listActiveExercises.mockResolvedValue([])

    const loader = Route.options.loader as (ctx: unknown) => Promise<unknown>
    await loader({ params: { workoutId: "missing" } }).catch((error) => {
      expect(isRedirect(error)).toBe(true)
      expect(error.options.to).toBe("/record")
    })
  })

  it("renders loading and load-error feedback", () => {
    const Pending = Route.options.pendingComponent as () => ReactNode
    const ErrorComponent = Route.options.errorComponent as () => ReactNode
    const { rerender } = render(<Pending />)
    expect(screen.getByRole("status")).toHaveTextContent("Loading workout")
    rerender(<ErrorComponent />)
    expect(screen.getByRole("alert")).toHaveTextContent(
      "couldn't load this workout"
    )
  })
})
