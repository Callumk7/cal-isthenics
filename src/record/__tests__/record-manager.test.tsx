import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RecordManager } from "../record-manager"

const templates = vi.hoisted(() => ({ readWorkoutTemplate: vi.fn() }))
const workouts = vi.hoisted(() => ({
  createWorkout: vi.fn(),
  createWorkoutFromTemplate: vi.fn(),
}))
vi.mock("@/templates/server-functions", () => templates)
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
      expect(screen.getByText("workout-123")).toBeInTheDocument()
    )
    expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument()
  })
})
