import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RecordManager } from "../record-manager"

const templates = vi.hoisted(() => ({ readWorkoutTemplate: vi.fn() }))
const workouts = vi.hoisted(() => ({
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
  listWorkouts: vi.fn(),
  prepareRepeatWorkout: vi.fn(),
  readPreviousPerformanceCues: vi.fn(),
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
    <a
      href={to
        .replace("$workoutId", params?.workoutId ?? "")
        .replace("$runId", params?.runId ?? "")}
      {...props}
    >
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

async function selectExercise(name: string) {
  fireEvent.click(screen.getByLabelText("Exercise"))
  fireEvent.click(await screen.findByRole("option", { name }))
}

beforeEach(() => {
  vi.resetAllMocks()
  window.localStorage.clear()
})

describe("RecordManager", () => {
  it("offers an explicit resume for a saved draft and keeps its request id", async () => {
    window.localStorage.setItem(
      "form.workout-draft",
      JSON.stringify({
        version: 1,
        requestId: "stable-request",
        savedAt: Date.now(),
        origin: "repeat",
        editor: {
          date: "2026-08-18",
          name: "Repeated push",
          notes: "keep me",
          rows: [
            {
              key: "first",
              variantId: "push-up",
              variantName: "Push-up",
              categoryName: "Push",
              notes: "first note",
              initialCue: { workoutDate: "2026-08-17", reps: [8] },
              sets: [{ key: "first-set", reps: "9" }],
            },
            {
              key: "second",
              variantId: "push-up",
              variantName: "Push-up",
              categoryName: "Push",
              notes: "second note",
              sets: [{ key: "second-set", reps: "7" }],
            },
          ],
        },
      })
    )
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(
      await screen.findByRole("button", { name: /resume workout/i })
    )
    expect(screen.getAllByRole("heading", { name: "Push-up" })).toHaveLength(2)
    expect(screen.getByLabelText("General notes (optional)")).toHaveValue(
      "keep me"
    )
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() => expect(workouts.createWorkout).toHaveBeenCalledOnce())
    expect(workouts.createWorkout.mock.calls[0][0].data.clientRequestId).toBe(
      "stable-request"
    )
  })

  it("confirms before replacing a recovered draft and only replaces after confirmation", async () => {
    window.localStorage.setItem(
      "form.workout-draft",
      JSON.stringify({
        version: 1,
        requestId: "existing-request",
        savedAt: Date.now(),
        origin: "blank",
        editor: { date: "2026-08-18", name: "Keep me", notes: "", rows: [] },
      })
    )
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)

    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }))
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Replace saved workout draft?"
    )
    fireEvent.click(screen.getByRole("button", { name: /keep draft/i }))
    expect(
      JSON.parse(window.localStorage.getItem("form.workout-draft")!)
    ).toMatchObject({
      requestId: "existing-request",
      editor: { name: "Keep me" },
    })

    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.click(screen.getByRole("button", { name: /replace draft/i }))
    expect(
      JSON.parse(window.localStorage.getItem("form.workout-draft")!)
    ).toMatchObject({
      origin: "blank",
    })
    expect(
      screen.getByRole("button", { name: /save workout/i })
    ).toBeInTheDocument()
  })

  it("retains an unavailable recovered row, disables it, and blocks saving", async () => {
    window.localStorage.setItem(
      "form.workout-draft",
      JSON.stringify({
        version: 1,
        requestId: "unavailable-request",
        savedAt: Date.now(),
        origin: "template",
        editor: {
          date: "2026-08-18",
          name: "Old template",
          notes: "",
          rows: [
            {
              key: "old-row",
              variantId: "missing",
              variantName: "Missing exercise",
              categoryName: "Old",
              notes: "keep this",
              sets: [{ key: "old-set", reps: "8" }],
            },
          ],
        },
      })
    )
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(
      await screen.findByRole("button", { name: /resume workout/i })
    )
    expect(
      screen.getByRole("heading", { name: "Missing exercise" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/set 1 reps/i)).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Remove unavailable exercises"
    )
    expect(workouts.createWorkout).not.toHaveBeenCalled()
    expect(window.localStorage.getItem("form.workout-draft")).not.toBeNull()
  })

  it("retains the draft after a failed save and submits a rapid double activation once", async () => {
    let resolveCreate:
      | ((value: { ok: true; value: { id: string } }) => void)
      | undefined
    workouts.createWorkout.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        })
    )
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    await selectExercise("Push-up")
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    fireEvent.change(screen.getByLabelText(/set 1 reps/i), {
      target: { value: "8" },
    })
    const save = screen.getByRole("button", { name: /save workout/i })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(workouts.createWorkout).toHaveBeenCalledOnce()
    const requestId =
      workouts.createWorkout.mock.calls[0][0].data.clientRequestId
    expect(
      JSON.parse(window.localStorage.getItem("form.workout-draft")!)
    ).toMatchObject({
      requestId,
    })
    resolveCreate?.({ ok: true, value: { id: "saved" } })
    await waitFor(() =>
      expect(window.localStorage.getItem("form.workout-draft")).toBeNull()
    )
  })

  it("keeps the run entry visible without an exercise library", () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={[]} />)
    expect(screen.getByRole("link", { name: /record a run/i })).toHaveAttribute(
      "href",
      "/record/run"
    )
    expect(
      screen.getByRole("heading", {
        name: /build your exercise library first/i,
      })
    ).toBeInTheDocument()
  })

  it("starts blank, supports repeated exercises and validates reps", async () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    await selectExercise("Push-up")
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    await selectExercise("Push-up")
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    expect(screen.getAllByRole("heading", { name: "Push-up" })).toHaveLength(2)
    expect(screen.queryByText("Old")).not.toBeInTheDocument()
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    expect(
      screen.getAllByText("Enter a positive whole number of reps.")
    ).toHaveLength(2)
  })

  it("repeats a recent workout into an independent cleared draft with source cues", async () => {
    workouts.prepareRepeatWorkout.mockResolvedValue({
      ok: true,
      value: {
        workoutDate: "2026-08-20",
        name: "Push day",
        exercises: [
          {
            activeVariant: {
              id: "push-up",
              name: "Push-up",
              categoryName: "Push",
            },
            notes: "old note",
            sets: [{ reps: 8 }, { reps: 6 }],
          },
        ],
      },
    })
    render(
      <RecordManager
        initialTemplates={[]}
        initialLibrary={library}
        initialWorkouts={[
          {
            id: "source",
            workoutDate: "2026-08-20",
            name: "Push day",
            exercises: [{ id: "e" }],
          },
        ]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }))
    await waitFor(() =>
      expect(workouts.prepareRepeatWorkout).toHaveBeenCalledWith({
        data: { id: "source" },
      })
    )
    expect(screen.getByLabelText("Workout name (optional)")).toHaveValue(
      "Push day"
    )
    expect(screen.getByLabelText("General notes (optional)")).toHaveValue("")
    expect(screen.getByLabelText("Exercise notes (optional)")).toHaveValue("")
    expect(
      screen
        .getAllByLabelText(/set \d+ reps/i)
        .map((input) => (input as HTMLInputElement).value)
    ).toEqual(["", ""])
    expect(screen.getByText(/last on 20 aug: 8 \/ 6/i)).toBeInTheDocument()
  })

  it("blocks unavailable repeat sources and links to exercise management", async () => {
    workouts.prepareRepeatWorkout.mockResolvedValue({
      ok: false,
      error: "repeat_unavailable",
      unavailable: [{ variantName: "Archived row" }],
    })
    render(
      <RecordManager
        initialTemplates={[]}
        initialLibrary={library}
        initialWorkouts={[
          {
            id: "source",
            workoutDate: "2026-08-20",
            name: "Push day",
            exercises: [],
          },
        ]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }))
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Archived row"
    )
    expect(
      screen.getByRole("link", { name: /manage exercise library/i })
    ).toHaveAttribute("href", "/exercises")
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
    await selectExercise("Push-up")
    fireEvent.click(screen.getByRole("button", { name: /add exercise/i }))
    fireEvent.change(screen.getByLabelText(/set 1 reps/i), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("couldn’t save")
    )
    expect(window.localStorage.getItem("form.workout-draft")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /save workout/i }))
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /view saved workout/i })
      ).toBeInTheDocument()
    )
  })

  it("reorders exercise rows with the move controls", async () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    for (const variant of ["Push-up", "Dips"]) {
      await selectExercise(variant)
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
    await selectExercise("Push-up")
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
      data: expect.objectContaining({
        clientRequestId: expect.any(String),
        workoutDate: "2026-08-18",
        name: "Back day",
        notes: "Felt strong",
        exercises: [
          { variantId: "push-up", notes: "Slow negatives", sets: ["8"] },
        ],
      }),
    })
  })

  it("blocks decimal, zero, and negative reps from being saved", async () => {
    render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    await selectExercise("Push-up")
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
    // New drafts require an accessible explicit confirmation, even when clean.
    fireEvent.click(screen.getByRole("button", { name: /^discard$/i }))
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Discard workout draft?"
    )
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }))
    expect(confirm).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: /start blank/i })
    ).toBeInTheDocument()
    // A dirty draft remains open when its confirmation is cancelled.
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }))
    fireEvent.change(screen.getByLabelText("Workout name (optional)"), {
      target: { value: "x" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^discard$/i }))
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(
      screen.getByRole("button", { name: /save workout/i })
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

  describe("saved-run discovery", () => {
    const savedRuns = [
      {
        id: "run-1",
        userId: "user",
        workoutDate: "2026-08-18",
        distanceMetres: 5000,
        durationSeconds: 1830,
        calories: 300,
        manualSpeedMilliKmH: null,
        calculatedAverageSpeedKmH: 9.84,
        effectiveAverageSpeedKmH: 9.84,
        runningIntensity: 49.18,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it("lists saved runs with links to their edit routes", () => {
      render(
        <RecordManager
          initialTemplates={[]}
          initialLibrary={library}
          initialRuns={savedRuns}
        />
      )
      expect(screen.getByRole("link", { name: /2026-08-18/i })).toHaveAttribute(
        "href",
        "/record/run/run-1"
      )
      expect(screen.getByText("5.00 km · 31 min")).toBeInTheDocument()
    })

    it("shows an empty saved-runs state", () => {
      render(<RecordManager initialTemplates={[]} initialLibrary={library} />)
      expect(screen.getByText("No saved runs yet.")).toBeInTheDocument()
    })
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
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("/record/w"))
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
          data: { from: "2026-08-18", to: "2026-08-18", limit: 100 },
        })
      )
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /push day/i })
        ).toBeInTheDocument()
      )
      expect(
        screen
          .getAllByRole("link")
          .filter((link) => link.getAttribute("href")?.startsWith("/record/w"))
          .length
      ).toBe(2)
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
      await selectExercise("Push-up")
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
