import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  WorkoutDeleteDialog,
  WorkoutEditor,
  editorFromWorkout,
} from "../workout-editor"
import type { WorkoutDetail } from "@/workouts/workouts"

const workouts = vi.hoisted(() => ({
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
}))
vi.mock("@/workouts/server-functions", () => workouts)
vi.mock("@/components/ui/router-link", () => ({
  RouterLink: ({
    to,
    children,
    ...props
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const library = [
  {
    id: "push",
    name: "Push",
    archivedAt: null,
    variants: [
      {
        id: "push-up",
        name: "Push-up",
        categoryId: "push",
        difficultyMultiplier: 1,
        archivedAt: null,
      },
      {
        id: "old",
        name: "Old",
        categoryId: "push",
        difficultyMultiplier: 1,
        archivedAt: "2026-01-01",
      },
    ],
  },
  {
    id: "old-category",
    name: "Old category",
    archivedAt: "2026-01-01",
    variants: [
      {
        id: "hidden",
        name: "Hidden",
        categoryId: "old-category",
        difficultyMultiplier: 1,
        archivedAt: null,
      },
    ],
  },
]

const now = new Date()
function workoutWith(
  exercises: Array<{
    sourceVariantId: string | null
    variantName: string
    categoryName: string
    notes?: string | null
    reps: number[]
  }>
): WorkoutDetail {
  return {
    id: "workout-1",
    userId: "user",
    workoutDate: "2026-08-18",
    name: "Push day",
    notes: "Felt strong",
    createdAt: now,
    updatedAt: now,
    exercises: exercises.map((exercise, index) => ({
      id: `ex-${index}`,
      workoutId: "workout-1",
      sourceVariantId: exercise.sourceVariantId,
      position: index,
      categoryName: exercise.categoryName,
      variantName: exercise.variantName,
      difficultyMultiplier: 1,
      notes: exercise.notes ?? null,
      createdAt: now,
      updatedAt: now,
      sets: exercise.reps.map((reps, setIndex) => ({
        id: `set-${index}-${setIndex}`,
        workoutExerciseId: `ex-${index}`,
        position: setIndex,
        reps,
        createdAt: now,
        updatedAt: now,
      })),
    })),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("WorkoutEditor (edit mode)", () => {
  it("maps a null source variant to an unavailable editor row", () => {
    const editor = editorFromWorkout(
      workoutWith([
        {
          sourceVariantId: null,
          variantName: "Removed row",
          categoryName: "Pull",
          reps: [5],
        },
      ])
    )

    expect(editor.rows[0]).toMatchObject({
      variantId: "",
      variantName: "Removed row",
      categoryName: "Pull",
    })
  })

  it("loads an edit form prefilled from the saved workout", () => {
    const workout = workoutWith([
      {
        sourceVariantId: "push-up",
        variantName: "Push-up",
        categoryName: "Push",
        notes: "Slow negatives",
        reps: [8, 10],
      },
    ])
    render(
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId="workout-1"
        onDiscard={() => {}}
        onSaved={() => {}}
      />
    )
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-18")
    expect(screen.getByLabelText("Workout name (optional)")).toHaveValue(
      "Push day"
    )
    expect(screen.getByLabelText("General notes (optional)")).toHaveValue(
      "Felt strong"
    )
    expect(screen.getByRole("heading", { name: "Push-up" })).toBeInTheDocument()
    expect(screen.getByLabelText("Exercise notes (optional)")).toHaveValue(
      "Slow negatives"
    )
    const repValues = screen
      .getAllByLabelText<HTMLInputElement>(/set \d+ reps/i)
      .map((input) => input.value)
    expect(repValues).toEqual(["8", "10"])
  })

  it("submits a full update for date, name, notes, order, repeats, notes, sets, and reps", async () => {
    workouts.updateWorkout.mockResolvedValue({
      ok: true,
      value: { id: "workout-1" },
    })
    const workout = workoutWith([
      {
        sourceVariantId: "push-up",
        variantName: "Push-up",
        categoryName: "Push",
        notes: "",
        reps: [8],
      },
      {
        sourceVariantId: "dips",
        variantName: "Dips",
        categoryName: "Push",
        notes: "",
        reps: [10, 12],
      },
    ])
    const onSaved = vi.fn()
    render(
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId="workout-1"
        onDiscard={() => {}}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-08-19" },
    })
    fireEvent.change(screen.getByLabelText("Workout name (optional)"), {
      target: { value: "Heavy day" },
    })
    fireEvent.change(screen.getByLabelText("General notes (optional)"), {
      target: { value: "Felt great" },
    })
    fireEvent.change(screen.getAllByLabelText("Exercise notes (optional)")[0], {
      target: { value: "Slow negatives" },
    })
    // Reorder: move Dips above Push-up.
    fireEvent.click(screen.getByRole("button", { name: /move "dips" up/i }))
    // Repeated exercise: add Push-up again as a third row.
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    fireEvent.change(screen.getAllByLabelText(/set 1 reps/i)[2], {
      target: { value: "5" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))

    await waitFor(() => expect(workouts.updateWorkout).toHaveBeenCalledOnce())
    expect(workouts.updateWorkout).toHaveBeenCalledWith({
      data: {
        id: "workout-1",
        workoutDate: "2026-08-19",
        name: "Heavy day",
        notes: "Felt great",
        exercises: [
          { variantId: "dips", notes: "", sets: ["10", "12"] },
          { variantId: "push-up", notes: "Slow negatives", sets: ["8"] },
          { variantId: "push-up", notes: "", sets: ["5"] },
        ],
      },
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("workout-1"))
  })

  it("keeps archived snapshots visible while the picker excludes archived variants", () => {
    const workout = workoutWith([
      {
        sourceVariantId: "push-up",
        variantName: "Push-up",
        categoryName: "Push",
        notes: "",
        reps: [8],
      },
      {
        sourceVariantId: "old",
        variantName: "Old",
        categoryName: "Push",
        notes: "",
        reps: [12],
      },
      {
        sourceVariantId: null,
        variantName: "Gone",
        categoryName: "Push",
        notes: "",
        reps: [5],
      },
    ])
    render(
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId="workout-1"
        onDiscard={() => {}}
        onSaved={() => {}}
      />
    )
    // All snapshot names remain visible, including the archived and deleted ones.
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(["Push-up", "Old", "Gone"])
    // The null-source row is read-only and flagged.
    expect(
      screen.getByText(/the original exercise is no longer available/i)
    ).toBeInTheDocument()
    const repInputs = screen.getAllByLabelText(/set 1 reps/i)
    expect(repInputs[0]).not.toBeDisabled()
    expect(repInputs[1]).not.toBeDisabled()
    expect(repInputs[2]).toBeDisabled()
    // The picker only offers active variants.
    expect(screen.queryByRole("option", { name: "Old" })).toBeNull()
    expect(screen.queryByRole("option", { name: "Hidden" })).toBeNull()
    expect(screen.getByRole("option", { name: "Push-up" })).toBeInTheDocument()
  })

  it("excludes read-only null-source rows from the update payload", async () => {
    workouts.updateWorkout.mockResolvedValue({
      ok: true,
      value: { id: "workout-1" },
    })
    const workout = workoutWith([
      {
        sourceVariantId: "push-up",
        variantName: "Push-up",
        categoryName: "Push",
        notes: "",
        reps: [8],
      },
      {
        sourceVariantId: "old",
        variantName: "Old",
        categoryName: "Push",
        notes: "",
        reps: [12],
      },
      {
        sourceVariantId: null,
        variantName: "Gone",
        categoryName: "Push",
        notes: "",
        reps: [5],
      },
    ])
    render(
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId="workout-1"
        onDiscard={() => {}}
        onSaved={() => {}}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() => expect(workouts.updateWorkout).toHaveBeenCalledOnce())
    const payload = workouts.updateWorkout.mock.calls[0][0].data
    expect(payload.exercises).toEqual([
      { variantId: "push-up", notes: "", sets: ["8"] },
      { variantId: "old", notes: "", sets: ["12"] },
    ])
    expect(
      payload.exercises.some(
        (row: { variantId: string }) => row.variantId === ""
      )
    ).toBe(false)
  })

  it("keeps the form and shows a recoverable error when an update fails", async () => {
    workouts.updateWorkout.mockResolvedValue({
      ok: false,
      error: "validation",
    })
    const workout = workoutWith([
      {
        sourceVariantId: "push-up",
        variantName: "Push-up",
        categoryName: "Push",
        notes: "",
        reps: [8],
      },
    ])
    render(
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId="workout-1"
        onDiscard={() => {}}
        onSaved={() => {}}
      />
    )
    fireEvent.change(screen.getByLabelText("Workout name (optional)"), {
      target: { value: "Renamed" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("couldn’t save")
    )
    // The existing form values survive the failed update.
    expect(screen.getByLabelText("Workout name (optional)")).toHaveValue(
      "Renamed"
    )
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-18")
    expect(screen.getByRole("heading", { name: "Push-up" })).toBeInTheDocument()
  })
})

describe("WorkoutDeleteDialog", () => {
  it("deletes only after confirmation and cancels without deleting", async () => {
    workouts.deleteWorkout.mockResolvedValue({
      ok: true,
      value: { id: "workout-1" },
    })
    const onDeleted = vi.fn()
    render(<WorkoutDeleteDialog workoutId="workout-1" onDeleted={onDeleted} />)
    expect(screen.queryByText("Delete workout?")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /delete workout/i }))
    expect(screen.getByText("Delete workout?")).toBeInTheDocument()
    // React Aria wraps modal content in an aria-hidden subtree; the dialog
    // buttons are only reachable through hidden: true role queries.
    fireEvent.click(
      screen.getByRole("button", { name: /cancel/i, hidden: true })
    )
    expect(workouts.deleteWorkout).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.queryByText("Delete workout?")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /delete workout/i }))
    const confirmButtons = screen.getAllByRole("button", {
      name: /delete workout/i,
      hidden: true,
    })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])
    await waitFor(() => expect(workouts.deleteWorkout).toHaveBeenCalledOnce())
    expect(workouts.deleteWorkout).toHaveBeenCalledWith({
      data: { id: "workout-1" },
    })
    expect(onDeleted).toHaveBeenCalledOnce()
  })

  it("shows a recoverable error and stays put when deletion fails", async () => {
    workouts.deleteWorkout.mockResolvedValue({ ok: false, error: "not_found" })
    const onDeleted = vi.fn()
    render(<WorkoutDeleteDialog workoutId="workout-1" onDeleted={onDeleted} />)
    fireEvent.click(screen.getByRole("button", { name: /delete workout/i }))
    const confirmButtons = screen.getAllByRole("button", {
      name: /delete workout/i,
      hidden: true,
    })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])
    await waitFor(() =>
      expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
        "couldn’t delete"
      )
    )
    expect(onDeleted).not.toHaveBeenCalled()
    // The dialog (and therefore the record's edit page) stays open.
    expect(screen.getByText("Delete workout?")).toBeInTheDocument()
  })
})
