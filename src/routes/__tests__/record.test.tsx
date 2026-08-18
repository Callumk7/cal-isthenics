import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

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
  createRunningWorkout: vi.fn(),
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
vi.mock("@/running/server-functions", () => ({
  createRunningWorkout: mocks.createRunningWorkout,
  listRunningWorkouts: mocks.listRunningWorkouts,
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

function mockAuthAndDiscovery() {
  mocks.getAuthState.mockResolvedValue({ authenticated: true, userId: "user" })
  mocks.listActiveExercises.mockResolvedValue([])
  mocks.listWorkoutTemplateSummaries.mockResolvedValue([])
  mocks.listWorkouts.mockResolvedValue([])
  mocks.listRunningWorkouts.mockResolvedValue({ ok: true, value: [] })
}

describe("record layout route", () => {
  it("renders the discovery page at /record via the index route", async () => {
    mockAuthAndDiscovery()
    renderRouterAt("/record")
    expect(
      await screen.findByRole("heading", { name: /record a workout/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /saved workouts/i })
    ).toBeInTheDocument()
  })

  it("renders the workout edit UI at /record/$workoutId via the child route", async () => {
    mockAuthAndDiscovery()
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

  it("does not let a discovery-loader failure block the nested edit route", async () => {
    mockAuthAndDiscovery()
    mocks.readWorkout.mockResolvedValue(workout)
    // The index route's listWorkouts call fails — irrelevant to the edit page.
    mocks.listWorkouts.mockRejectedValue(new Error("network"))
    renderRouterAt("/record/workout-1")
    expect(
      await screen.findByRole("heading", { name: /edit workout/i })
    ).toBeInTheDocument()
  })

  it("renders /record/run with Record navigation active", async () => {
    mockAuthAndDiscovery()
    renderRouterAt("/record/run")
    expect(
      await screen.findByRole("heading", { name: /record a run/i })
    ).toBeInTheDocument()
    expect(
      screen
        .getAllByRole("link", { name: /^record$/i })
        .some((link) => link.getAttribute("aria-current") === "page")
    ).toBe(true)
  })

  it("navigates from the discovery Record a run entry to the run form", async () => {
    const user = userEvent.setup()
    mockAuthAndDiscovery()
    renderRouterAt("/record")
    const section = await screen.findByRole("heading", {
      name: /record a run/i,
    })
    await user.click(
      screen.getByRole("link", { name: /record a run/i, hidden: false })
    )
    expect(section).not.toBeNull()
    expect(
      await screen.findByRole("heading", { name: /record a run/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Distance (km)")).toBeInTheDocument()
  })
})
