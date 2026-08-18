import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { routeTree } from "@/routeTree.gen"

const api = vi.hoisted(() => ({
  getAuthState: vi.fn(),
  listManagedExercises: vi.fn(),
  listActiveExercises: vi.fn(),
  addExerciseCategory: vi.fn(),
  updateExerciseCategory: vi.fn(),
  removeExerciseCategory: vi.fn(),
  addExerciseVariant: vi.fn(),
  updateExerciseVariant: vi.fn(),
  removeExerciseVariant: vi.fn(),
  listWorkoutTemplateSummaries: vi.fn(),
  readWorkoutTemplate: vi.fn(),
  createWorkoutTemplate: vi.fn(),
  updateWorkoutTemplate: vi.fn(),
  deleteWorkoutTemplate: vi.fn(),
  listWorkouts: vi.fn(),
  readWorkout: vi.fn(),
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  listRunningWorkouts: vi.fn(),
}))

vi.mock("@/auth/server-functions", () => ({
  getAuthState: api.getAuthState,
  logout: vi.fn(),
}))
vi.mock("@/exercises/server-functions", () => ({
  listManagedExercises: api.listManagedExercises,
  listActiveExercises: api.listActiveExercises,
  addExerciseCategory: api.addExerciseCategory,
  updateExerciseCategory: api.updateExerciseCategory,
  removeExerciseCategory: api.removeExerciseCategory,
  addExerciseVariant: api.addExerciseVariant,
  updateExerciseVariant: api.updateExerciseVariant,
  removeExerciseVariant: api.removeExerciseVariant,
}))
vi.mock("@/templates/server-functions", () => ({
  listWorkoutTemplateSummaries: api.listWorkoutTemplateSummaries,
  readWorkoutTemplate: api.readWorkoutTemplate,
  createWorkoutTemplate: api.createWorkoutTemplate,
  updateWorkoutTemplate: api.updateWorkoutTemplate,
  deleteWorkoutTemplate: api.deleteWorkoutTemplate,
}))
vi.mock("@/workouts/server-functions", () => ({
  listWorkouts: api.listWorkouts,
  readWorkout: api.readWorkout,
  createWorkout: api.createWorkout,
  createWorkoutFromTemplate: api.createWorkoutFromTemplate,
  updateWorkout: api.updateWorkout,
  deleteWorkout: api.deleteWorkout,
}))
vi.mock("@/running/server-functions", () => ({
  listRunningWorkouts: api.listRunningWorkouts,
}))

const now = new Date("2030-01-01T00:00:00Z")
const variant = {
  id: "ring-row",
  userId: "owner",
  categoryId: "pull",
  name: "Ring row",
  difficultyMultiplier: 1250,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
}
const category = {
  id: "pull",
  userId: "owner",
  name: "Pull",
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  variants: [variant],
}
const template = {
  id: "pull-template",
  name: "Pull strength",
  updatedAt: now,
  exerciseCount: 1,
  canStart: true,
}
const workout = {
  id: "workout-1",
  userId: "owner",
  workoutDate: "2030-02-03",
  name: "Pull strength",
  notes: null,
  createdAt: now,
  updatedAt: now,
  exercises: [
    {
      id: "workout-row",
      workoutId: "workout-1",
      sourceVariantId: variant.id,
      position: 0,
      categoryName: category.name,
      variantName: variant.name,
      difficultyMultiplier: 1250,
      notes: null,
      createdAt: now,
      updatedAt: now,
      sets: [
        {
          id: "set-1",
          workoutExerciseId: "workout-row",
          position: 0,
          reps: 8,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
  ],
}

function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPreload: false,
  })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset())
  api.getAuthState.mockResolvedValue({ authenticated: true })
  api.listManagedExercises.mockResolvedValue([category])
  api.listActiveExercises.mockResolvedValue([category])
  api.listWorkoutTemplateSummaries.mockResolvedValue([template])
  api.listWorkouts.mockResolvedValue([workout])
  api.listRunningWorkouts.mockResolvedValue({ ok: true, value: [] })
  api.readWorkout.mockResolvedValue(workout)
})

describe("route rendering with mocked server-function boundaries", () => {
  it("renders exercise-library data at /exercises", async () => {
    renderAt("/exercises")

    expect(
      await screen.findByRole("heading", { name: variant.name })
    ).toBeInTheDocument()
    expect(api.listManagedExercises).toHaveBeenCalledOnce()
  })

  it("renders template summaries at /templates", async () => {
    renderAt("/templates")

    expect(
      await screen.findByRole("heading", { name: template.name })
    ).toBeInTheDocument()
    expect(api.listWorkoutTemplateSummaries).toHaveBeenCalledOnce()
    expect(api.listActiveExercises).toHaveBeenCalledOnce()
  })

  it("renders template and workout discovery data at /record", async () => {
    renderAt("/record")

    expect(
      await screen.findByRole("heading", { name: template.name })
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(workout.workoutDate))
    ).toBeInTheDocument()
    expect(api.listWorkouts).toHaveBeenCalledOnce()
  })

  it("renders workout detail data at /record/$workoutId", async () => {
    renderAt(`/record/${workout.id}`)

    expect(
      await screen.findByRole("heading", { name: "Edit workout" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Workout name (optional)")).toHaveValue(
      workout.name
    )
    expect(
      screen.getByRole("heading", { name: variant.name })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Save workout" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Delete workout" })
    ).toBeInTheDocument()
    expect(api.readWorkout).toHaveBeenCalledWith({
      data: { id: workout.id },
    })
  })
})
