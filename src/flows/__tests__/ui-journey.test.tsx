import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { routeTree } from "@/routeTree.gen"

const api = vi.hoisted(() => ({
  getAuthState: vi.fn(),
  listManagedExercises: vi.fn(),
  listActiveExercises: vi.fn(),
  addExerciseCategory: vi.fn(),
  updateExerciseCategory: vi.fn(),
  archiveExerciseCategory: vi.fn(),
  addExerciseVariant: vi.fn(),
  updateExerciseVariant: vi.fn(),
  archiveExerciseVariant: vi.fn(),
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
  archiveExerciseCategory: api.archiveExerciseCategory,
  addExerciseVariant: api.addExerciseVariant,
  updateExerciseVariant: api.updateExerciseVariant,
  archiveExerciseVariant: api.archiveExerciseVariant,
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

const now = new Date("2030-01-01T00:00:00Z")
const category = {
  id: "pull",
  userId: "owner",
  name: "Pull",
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  variants: [] as Array<{
    id: string
    userId: string
    categoryId: string
    name: string
    difficultyMultiplier: number
    archivedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }>,
}
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
const templateDetail = {
  id: "pull-template",
  userId: "owner",
  name: "Pull strength",
  createdAt: now,
  updatedAt: now,
  canStart: true,
  exercises: [
    {
      id: "template-row",
      position: 0,
      setCount: 1,
      variantId: variant.id,
      variantName: variant.name,
      difficultyMultiplier: 1250,
      variantArchived: false,
      categoryId: category.id,
      categoryName: category.name,
      categoryArchived: false,
      archived: false,
    },
  ],
}
const summary = {
  id: templateDetail.id,
  name: templateDetail.name,
  updatedAt: now,
  exerciseCount: 1,
  canStart: true,
}
let categoryCreated = false

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

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset())
  categoryCreated = false
  category.variants = []
  api.getAuthState.mockResolvedValue({ authenticated: true, userId: "owner" })
  api.listManagedExercises.mockImplementation(async () =>
    categoryCreated ? [category] : []
  )
  api.listActiveExercises.mockImplementation(async () =>
    category.variants.length ? [category] : []
  )
  api.listWorkoutTemplateSummaries.mockResolvedValue([])
  api.listWorkouts.mockResolvedValue([])
})

describe("route-level core UI journey", () => {
  it("carries realistic flow data across each route boundary", async () => {
    categoryCreated = true
    category.variants = [variant]
    api.listWorkoutTemplateSummaries.mockResolvedValue([summary])
    api.listWorkouts.mockResolvedValue([workout])
    api.readWorkout.mockResolvedValue(workout)

    const renderAt = (path: string) => {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [path] }),
        defaultPreload: false,
      })
      return render(<RouterProvider router={router} />)
    }

    renderAt("/exercises")
    expect(
      await screen.findByRole("heading", { name: variant.name })
    ).toBeInTheDocument()

    cleanup()
    renderAt("/templates")
    expect(
      await screen.findByRole("heading", { name: templateDetail.name })
    ).toBeInTheDocument()

    cleanup()
    renderAt("/record")
    expect(
      await screen.findByRole("heading", { name: templateDetail.name })
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(workout.workoutDate))
    ).toBeInTheDocument()

    cleanup()
    renderAt(`/record/${workout.id}`)
    expect(
      await screen.findByRole("heading", { name: "Edit workout" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Workout name (optional)")).toHaveValue(
      templateDetail.name
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
  })
})
