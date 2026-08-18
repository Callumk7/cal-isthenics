import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RecordManager } from "../record-manager"

const templates = vi.hoisted(() => ({ readWorkoutTemplate: vi.fn() }))
const workouts = vi.hoisted(() => ({
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
  listWorkouts: vi.fn(),
}))
vi.mock("@/templates/server-functions", () => templates)
vi.mock("@/workouts/server-functions", () => workouts)
vi.mock("@/components/ui/router-link", () => ({
  RouterLink: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
  }) => (
    <a href={to.replace("$workoutId", params?.workoutId ?? "")} {...props}>
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
        id: "dips",
        name: "Dips",
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
const summary = {
  id: "template",
  name: "Push day",
  updatedAt: new Date(),
  exerciseCount: 1,
  canStart: true,
}
const detail = {
  ...summary,
  userId: "user",
  createdAt: new Date(),
  exercises: [
    {
      id: "exercise",
      position: 0,
      setCount: 2,
      variantId: "push-up",
      variantName: "Push-up",
      difficultyMultiplier: 1,
      variantArchived: false,
      categoryId: "push",
      categoryName: "Push",
      categoryArchived: false,
      archived: false,
    },
  ],
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("RecordManager", () => {
  it("starts blank, supports repeated exercises and validates reps", () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    expect(screen.getAllByRole("heading", { name: "Push-up" })).toHaveLength(2)
    expect(screen.queryByText("Old")).not.toBeInTheDocument()
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    expect(
      screen.getAllByText("Enter a positive whole number of reps.")
    ).toHaveLength(2)
  })

  it("starts a template with its configured blank set slots", async () => {
    templates.readWorkoutTemplate.mockResolvedValue(detail)
    render(
      <RecordManager initialTemplates={[summary]} initialLibrary={library} />
    )
    fireEvent.click(screen.getByRole("button", { name: /use template/i }))
    await waitFor(() =>
      expect(screen.getAllByLabelText(/set \d+ reps/i)).toHaveLength(2)
    )
    expect(screen.getByLabelText("Workout name (optional)")).toHaveValue(
      "Push day"
    )
  })

  it("shows save failures and the persisted workout id", async () => {
    workouts.createWorkout
      .mockResolvedValueOnce({ ok: false, error: "validation" })
      .mockResolvedValueOnce({ ok: true, value: { id: "workout-123" } })
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    fireEvent.change(screen.getByLabelText(/set 1 reps/i), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("couldn’t save")
    )
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /view saved workout/i })
      ).toBeInTheDocument()
    )
  })

  it("reorders exercise rows with the move controls", () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    for (const variant of ["push-up", "dips"]) {
      fireEvent.change(screen.getByLabelText("Exercise"), {
        target: { value: variant },
      })
      fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    }
    let headings = screen.getAllByRole("heading", { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Push-up",
      "Dips",
    ])
    fireEvent.click(screen.getByRole("button", { name: /move "dips" up/i }))
    headings = screen.getAllByRole("heading", { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Dips",
      "Push-up",
    ])
  })

  it("submits date, name, general notes, and per-exercise notes", async () => {
    workouts.createWorkout.mockResolvedValue({ ok: true, value: { id: "w" } })
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-08-18" },
    })
    fireEvent.change(screen.getByLabelText("Workout name (optional)"), {
      target: { value: "Back day" },
    })
    fireEvent.change(screen.getByLabelText("General notes (optional)"), {
      target: { value: "Felt strong" },
    })
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    fireEvent.change(screen.getByLabelText("Exercise notes (optional)"), {
      target: { value: "Slow negatives" },
    })
    fireEvent.change(screen.getByLabelText(/set 1 reps/i), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() => expect(workouts.createWorkout).toHaveBeenCalledOnce())
    expect(workouts.createWorkout).toHaveBeenCalledWith({
      data: {
        workoutDate: "2026-08-18",
        name: "Back day",
        notes: "Felt strong",
        exercises: [
          { variantId: "push-up", notes: "Slow negatives", sets: ["8"] },
        ],
      },
    })
  })

  it("blocks decimal, zero, and negative reps from being saved", () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    for (const value of ["1.5", "0", "-2", "abc"]) {
      fireEvent.change(screen.getByLabelText(/set 1 reps/i), {
        target: { value },
      })
      fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
      expect(
        screen.getByText("Enter a positive whole number of reps.")
      ).toBeInTheDocument()
    }
    expect(workouts.createWorkout).not.toHaveBeenCalled()
  })

  it("registers one beforeunload listener that reads the latest dirty state", () => {
    const addEventListener = vi.spyOn(window, "addEventListener")
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))

    const beforeUnloadCalls = addEventListener.mock.calls.filter(
      ([type]) => String(type) === "beforeunload"
    )
    expect(beforeUnloadCalls).toHaveLength(1)
    const listener = beforeUnloadCalls[0][1] as EventListener
    const cleanEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent
    listener(cleanEvent)
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Workout name (optional)"), {
      target: { value: "Push day" },
    })
    expect(
      addEventListener.mock.calls.filter(
        ([type]) => String(type) === "beforeunload"
      )
    ).toHaveLength(1)
    const dirtyEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent
    listener(dirtyEvent)
    expect(dirtyEvent.preventDefault).toHaveBeenCalledOnce()
    expect(dirtyEvent.returnValue).toBe("")
  })

  it("confirms before discarding unsaved changes but exits cleanly when clean", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    // A clean form discards without a prompt.
    fireEvent.click(screen.getByRole("button", { name: /discard/i }))
    expect(confirm).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: /start blank/i })
    ).toBeInTheDocument()
    // A dirty form prompts; cancelling keeps the editor open.
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.change(screen.getByLabelText("Workout name (optional)"), {
      target: { value: "x" },
    })
    fireEvent.click(screen.getByRole("button", { name: /discard/i }))
    expect(confirm).toHaveBeenCalledWith(
      "Discard your unsaved workout changes?"
    )
    expect(
      screen.getByRole("button", { name: /save workout/i })
    ).toBeInTheDocument()
    // Confirming discards and returns to the start screen.
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole("button", { name: /discard/i }))
    expect(
      screen.getByRole("button", { name: /start blank/i })
    ).toBeInTheDocument()
  })

  it("visibly blocks ineligible templates with guidance", () => {
    const ineligible = { ...summary, id: "bad", canStart: false }
    render(
      <RecordManager initialTemplates={[ineligible]} initialLibrary={library} />
    )
    const button = screen.getByRole("button", { name: /use template/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/ineligible/i)).toBeInTheDocument()
    expect(
      screen.getByText(/archived exercises or no exercises/i)
    ).toBeInTheDocument()
    fireEvent.click(button)
    expect(templates.readWorkoutTemplate).not.toHaveBeenCalled()
  })

  describe("saved-workout discovery", () => {
    const savedWorkouts = [
      {
        id: "w1",
        workoutDate: "2026-08-18",
        name: "Push day",
        exercises: [{ id: "e1" }, { id: "e2" }],
      },
      {
        id: "w2",
        workoutDate: "2026-08-18",
        name: null,
        exercises: [{ id: "e3" }],
      },
      {
        id: "w3",
        workoutDate: "2026-08-10",
        name: "Leg day",
        exercises: [{ id: "e4" }],
      },
    ]

    it("lists recent saved workouts and links each to its detail route", () => {
      render(
        <RecordManager
          initialTemplates={[]}
          initialLibrary={library}
          initialWorkouts={savedWorkouts}
        />
      )
      const links = screen.getAllByRole("link")
      expect(screen.getByRole("link", { name: /push day/i })).toHaveAttribute(
        "href",
        "/record/w1"
      )
      // An unnamed workout falls back to "Workout" and still links through.
      expect(screen.getByRole("link", { name: /workout/i })).toHaveAttribute(
        "href",
        "/record/w2"
      )
      expect(links).toHaveLength(3)
      expect(screen.getByText("2026-08-18 · 2 exercises")).toBeInTheDocument()
      expect(screen.getByText("2026-08-10 · 1 exercise")).toBeInTheDocument()
    })

    it("filters by a calendar date and shows multiple workouts from that date", async () => {
      workouts.listWorkouts.mockResolvedValue([
        savedWorkouts[0],
        savedWorkouts[1],
      ])
      render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
      fireEvent.change(screen.getByLabelText("Date"), {
        target: { value: "2026-08-18" },
      })
      await waitFor(() =>
        expect(workouts.listWorkouts).toHaveBeenCalledWith({
          data: { from: "2026-08-18", to: "2026-08-18" },
        })
      )
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /push day/i })
        ).toBeInTheDocument()
      )
      expect(screen.getAllByRole("link").length).toBe(2)
      // Clearing the date returns to the recent list.
      workouts.listWorkouts.mockResolvedValue(savedWorkouts)
      fireEvent.change(screen.getByLabelText("Date"), {
        target: { value: "" },
      })
      await waitFor(() =>
        expect(workouts.listWorkouts).toHaveBeenCalledWith({ data: {} })
      )
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /leg day/i })
        ).toBeInTheDocument()
      )
    })

    it("shows a recoverable error and keeps the previous list when filtering fails", async () => {
      render(
        <RecordManager
          initialTemplates={[]}
          initialLibrary={library}
          initialWorkouts={[savedWorkouts[2]]}
        />
      )
      workouts.listWorkouts.mockRejectedValue(new Error("network"))
      fireEvent.change(screen.getByLabelText("Date"), {
        target: { value: "2026-08-18" },
      })
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "couldn’t load saved workouts"
        )
      )
      expect(screen.getByRole("link", { name: /leg day/i })).toBeInTheDocument()
    })

    it("refreshes the saved-workout list after a workout is saved", async () => {
      workouts.createWorkout.mockResolvedValue({
        ok: true,
        value: { id: "w-new" },
      })
      workouts.listWorkouts.mockResolvedValue([])
      render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
      fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
      fireEvent.change(screen.getByLabelText("Exercise"), {
        target: { value: "push-up" },
      })
      fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
      fireEvent.change(screen.getByLabelText(/set 1 reps/i), {
        target: { value: "8" },
      })
      fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /view saved workout/i })
        ).toBeInTheDocument()
      )
      expect(workouts.listWorkouts).toHaveBeenCalledWith({ data: {} })
    })
  })
})
