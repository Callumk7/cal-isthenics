import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../record"
import { routeTree } from "../../routeTree.gen"

const mocks = vi.hoisted(() => ({
  listWorkoutTemplateSummaries: vi.fn(),
  listActiveExercises: vi.fn(),
  listWorkouts: vi.fn(),
  readWorkout: vi.fn(),
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  getAuthState: vi.fn(),
}))

vi.mock("@/templates/server-functions", () => ({
  listWorkoutTemplateSummaries: mocks.listWorkoutTemplateSummaries,
}))
vi.mock("@/exercises/server-functions", () => ({
  listActiveExercises: mocks.listActiveExercises,
}))
vi.mock("@/workouts/server-functions", () => ({
  listWorkouts: mocks.listWorkouts,
  readWorkout: mocks.readWorkout,
  createWorkout: mocks.createWorkout,
  createWorkoutFromTemplate: mocks.createWorkoutFromTemplate,
  updateWorkout: mocks.updateWorkout,
  deleteWorkout: mocks.deleteWorkout,
}))
vi.mock("@/auth/server-functions", () => ({
  getAuthState: mocks.getAuthState,
  logout: vi.fn(),
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

function renderRouterAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    scrollRestoration: true,
    defaultPreload: false,
  })
  return render(<RouterProvider router={router} />)
}

describe("record route", () => {
  it("loads templates, the active library, and recent workouts together", async () => {
    mocks.listWorkoutTemplateSummaries.mockResolvedValue([{ id: "template" }])
    mocks.listActiveExercises.mockResolvedValue([{ id: "category" }])
    mocks.listWorkouts.mockResolvedValue([])

    const loader = Route.options.loader as (
      context: unknown
    ) => Promise<unknown>
    await expect(loader({})).resolves.toEqual({
      templates: [{ id: "template" }],
      library: [{ id: "category" }],
      workouts: [],
    })
    expect(mocks.listWorkoutTemplateSummaries).toHaveBeenCalledOnce()
    expect(mocks.listActiveExercises).toHaveBeenCalledOnce()
    expect(mocks.listWorkouts).toHaveBeenCalledOnce()
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

  it("renders the record page at /record", async () => {
    mocks.getAuthState.mockResolvedValue({
      authenticated: true,
      userId: "user",
    })
    mocks.listActiveExercises.mockResolvedValue([])
    mocks.listWorkoutTemplateSummaries.mockResolvedValue([])
    mocks.listWorkouts.mockResolvedValue([])
    renderRouterAt("/record")
    expect(
      await screen.findByRole("heading", { name: /record a workout/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /saved workouts/i })
    ).toBeInTheDocument()
  })

  it("renders the workout edit UI at /record/$workoutId via the parent Outlet", async () => {
    mocks.getAuthState.mockResolvedValue({
      authenticated: true,
      userId: "user",
    })
    mocks.listActiveExercises.mockResolvedValue([])
    mocks.listWorkoutTemplateSummaries.mockResolvedValue([])
    mocks.listWorkouts.mockResolvedValue([])
    mocks.readWorkout.mockResolvedValue(workout)
    renderRouterAt("/record/workout-1")
    expect(
      await screen.findByRole("heading", { name: /edit workout/i })
    ).toBeInTheDocument()
    expect(await screen.findByLabelText("Workout name (optional)")).toHaveValue(
      "Push day"
    )
    expect(
      screen.getByRole("button", { name: /delete workout/i })
    ).toBeInTheDocument()
    // The discovery page must not render underneath the nested route.
    expect(
      screen.queryByRole("heading", { name: /record a workout/i })
    ).toBeNull()
  })
})
