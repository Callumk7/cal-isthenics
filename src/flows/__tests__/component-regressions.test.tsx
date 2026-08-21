import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ExerciseLibraryManager } from "@/exercises/library-manager"
import { RecordManager } from "@/record/record-manager"
import { WorkoutDeleteDialog, WorkoutEditor } from "@/record/workout-editor"
import { TemplateManager } from "@/templates/template-manager"

const api = vi.hoisted(() => ({
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  listWorkouts: vi.fn(),
  readWorkoutTemplate: vi.fn(),
  createWorkoutTemplate: vi.fn(),
  updateWorkoutTemplate: vi.fn(),
  deleteWorkoutTemplate: vi.fn(),
  addExerciseCategory: vi.fn(),
  updateExerciseCategory: vi.fn(),
  removeExerciseCategory: vi.fn(),
  addExerciseVariant: vi.fn(),
  updateExerciseVariant: vi.fn(),
  removeExerciseVariant: vi.fn(),
}))

vi.mock("@/workouts/server-functions", () => ({
  createWorkout: api.createWorkout,
  createWorkoutFromTemplate: api.createWorkoutFromTemplate,
  updateWorkout: api.updateWorkout,
  deleteWorkout: api.deleteWorkout,
  listWorkouts: api.listWorkouts,
}))
vi.mock("@/templates/server-functions", () => ({
  readWorkoutTemplate: api.readWorkoutTemplate,
  createWorkoutTemplate: api.createWorkoutTemplate,
  updateWorkoutTemplate: api.updateWorkoutTemplate,
  deleteWorkoutTemplate: api.deleteWorkoutTemplate,
}))
vi.mock("@/exercises/server-functions", () => ({
  addExerciseCategory: api.addExerciseCategory,
  updateExerciseCategory: api.updateExerciseCategory,
  removeExerciseCategory: api.removeExerciseCategory,
  addExerciseVariant: api.addExerciseVariant,
  updateExerciseVariant: api.updateExerciseVariant,
  removeExerciseVariant: api.removeExerciseVariant,
}))
vi.mock("@/components/ui/router-link", () => ({
  RouterLink: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}))

const longName = "UnbrokenWorkoutName".repeat(5)
const library = [
  {
    id: "pull",
    name: "Pull",
    archivedAt: null,
    variants: [
      {
        id: "row",
        categoryId: "pull",
        name: longName,
        difficultyMultiplier: 1250,
        archivedAt: null,
      },
    ],
  },
]
const template = {
  id: "template",
  name: longName,
  updatedAt: new Date(),
  exerciseCount: 1,
  canStart: true,
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset())
  api.listWorkouts.mockResolvedValue([])
})

describe("component accessibility and markup regression guards", () => {
  it("applies the intended fluid-container and text-wrapping classes", () => {
    render(
      <RecordManager
        initialLibrary={library}
        initialTemplates={[template]}
        initialWorkouts={[
          {
            id: "workout",
            workoutDate: "2030-02-03",
            name: longName,
            exercises: [{}],
          },
        ]}
      />
    )

    const main = screen.getByRole("main")
    expect(main).toHaveClass("w-full", "max-w-3xl")
    expect(screen.getByRole("heading", { name: longName })).toHaveClass(
      "break-words"
    )
    const savedName = screen.getAllByText(longName).at(-1)
    expect(savedName).toHaveClass("min-w-0", "break-words")
    expect(savedName?.parentElement).toHaveClass("min-w-0", "break-words")
  })

  it("supports a keyboard-only blank workout and exposes editor control names", async () => {
    const user = userEvent.setup()
    api.createWorkout.mockResolvedValue({
      ok: true,
      value: { id: "saved" },
    })
    const onSaved = vi.fn()
    render(
      <WorkoutEditor
        editor={{
          date: "2030-02-03",
          name: "",
          notes: "",
          rows: [],
        }}
        library={library}
        onDiscard={vi.fn()}
        onSaved={onSaved}
      />
    )

    const date = screen.getByLabelText("Date")
    date.focus()
    expect(date).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText("Workout name (optional)")).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText("General notes (optional)")).toHaveFocus()
    await user.tab()
    const picker = screen.getByLabelText("Exercise")
    expect(picker).toHaveFocus()
    await user.keyboard("{ArrowDown}{Enter}")
    await waitFor(() => expect(picker).toHaveFocus())
    await user.tab()
    const add = screen.getByRole("button", { name: "Add exercise" })
    expect(add).toHaveFocus()
    await user.keyboard("{Enter}")

    const reps = await screen.findByLabelText("Set 1 reps")
    expect(
      screen.getByRole("button", { name: `Move "${longName}" up` })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: `Remove set 1 from ${longName}` })
    ).toBeInTheDocument()
    await user.type(reps, "8")
    screen.getByRole("button", { name: "Save workout" }).focus()
    await user.keyboard("{Enter}")
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("saved"))
  })

  it("announces save failures and keeps the workout form available", async () => {
    const user = userEvent.setup()
    api.createWorkout.mockRejectedValue(new Error("offline"))
    render(
      <WorkoutEditor
        editor={{
          date: "2030-02-03",
          name: "Pull",
          notes: "",
          rows: [
            {
              key: "exercise",
              variantId: "row",
              variantName: longName,
              categoryName: "Pull",
              notes: "",
              sets: [{ key: "set", reps: "8" }],
            },
          ],
        }}
        library={library}
        onDiscard={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: "Save workout" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn’t save your workout/i
    )
    expect(
      screen.getByRole("button", { name: "Save workout" })
    ).toBeInTheDocument()
  })

  it("restores focus when destructive workout deletion is cancelled with Escape", async () => {
    const user = userEvent.setup()
    render(<WorkoutDeleteDialog workoutId="workout" onDeleted={vi.fn()} />)
    const trigger = screen.getByRole("button", { name: "Delete workout" })
    trigger.focus()
    await user.keyboard("{Enter}")
    expect(await screen.findByText("Delete workout?")).toBeInTheDocument()
    expect(api.deleteWorkout).not.toHaveBeenCalled()
    await user.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("saves an edit that drops every unavailable row through the update payload", async () => {
    const user = userEvent.setup()
    api.updateWorkout.mockResolvedValue({
      ok: true,
      value: { id: "workout" },
    })
    const onSaved = vi.fn()
    render(
      <WorkoutEditor
        editor={{
          date: "2030-02-03",
          name: "Cleanup",
          notes: "",
          rows: [
            {
              key: "gone-1",
              variantId: "",
              variantName: "Deleted pull-up",
              categoryName: "Pull",
              notes: "",
              sets: [{ key: "set-1", reps: "8" }],
            },
            {
              key: "gone-2",
              variantId: "",
              variantName: "Deleted ring row",
              categoryName: "Pull",
              notes: "",
              sets: [{ key: "set-2", reps: "6" }],
            },
          ],
        }}
        library={library}
        workoutId="workout"
        onDiscard={vi.fn()}
        onSaved={onSaved}
      />
    )

    await user.click(screen.getByRole("button", { name: "Save workout" }))
    await waitFor(() =>
      expect(api.updateWorkout).toHaveBeenCalledWith({
        data: {
          id: "workout",
          workoutDate: "2030-02-03",
          name: "Cleanup",
          notes: "",
          exercises: [],
        },
      })
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("workout"))
  })

  it("gives compact controls stable names and confirms an archive mutation", async () => {
    const user = userEvent.setup()
    api.removeExerciseCategory.mockResolvedValue({
      ok: true,
      value: { id: "pull" },
    })
    render(
      <ExerciseLibraryManager
        initialCategories={[
          {
            id: "pull",
            name: "Pull",
            archivedAt: null,
            variants: [],
          },
        ]}
      />
    )
    expect(
      screen.getByRole("button", { name: "Add category" })
    ).toBeInTheDocument()
    const archive = screen.getByRole("button", { name: "Archive Pull" })
    await user.click(archive)
    expect(api.removeExerciseCategory).not.toHaveBeenCalled()
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      /cannot be undone/i
    )

    await user.click(screen.getByRole("button", { name: "Archive" }))

    await waitFor(() =>
      expect(api.removeExerciseCategory).toHaveBeenCalledWith({
        data: { id: "pull" },
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(screen.getByText("Archived")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Archive Pull" })
    ).not.toBeInTheDocument()
  })

  it("labels the compact template control and blocks ineligible templates with guidance", () => {
    render(
      <TemplateManager
        initialLibrary={library}
        initialTemplates={[{ ...template, canStart: false }]}
      />
    )
    expect(
      screen.getByRole("button", { name: "New template" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/update it in Templates|replace or remove/i)
    ).toBeInTheDocument()
  })
})
