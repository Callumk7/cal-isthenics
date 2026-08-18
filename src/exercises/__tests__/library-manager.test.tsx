import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ExerciseLibraryManager } from "../library-manager"

const api = vi.hoisted(() => ({
  addExerciseCategory: vi.fn(),
  addExerciseVariant: vi.fn(),
  removeExerciseCategory: vi.fn(),
  removeExerciseVariant: vi.fn(),
  updateExerciseCategory: vi.fn(),
  updateExerciseVariant: vi.fn(),
}))

vi.mock("../server-functions", () => api)

const category = {
  id: "category-1",
  name: "Pull-up",
  archivedAt: null,
  variants: [
    {
      id: "variant-1",
      categoryId: "category-1",
      name: "Band assisted",
      difficultyMultiplier: 750,
      archivedAt: null,
    },
  ],
}

describe("ExerciseLibraryManager", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
  })

  it("shows an empty state and creates a category", async () => {
    api.addExerciseCategory.mockResolvedValue({
      ok: true,
      value: { id: "new", name: "Squat", archivedAt: null },
    })
    render(<ExerciseLibraryManager initialCategories={[]} />)

    expect(screen.getByText("No exercise categories yet")).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: "Add your first category" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Squat" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByRole("heading", { name: "Squat" })
    ).toBeInTheDocument()
  })

  it("edits a category", async () => {
    api.updateExerciseCategory.mockResolvedValue({
      ok: true,
      value: { ...category, name: "Chin-up" },
    })
    render(<ExerciseLibraryManager initialCategories={[category]} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit Pull-up" }))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Chin-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByRole("heading", { name: "Chin-up" })
    ).toBeInTheDocument()
  })

  it("validates malformed and non-positive multipliers inline", async () => {
    render(<ExerciseLibraryManager initialCategories={[category]} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Add progression variant" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Negative" },
    })
    fireEvent.change(screen.getByLabelText("Difficulty multiplier"), {
      target: { value: "0" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByText(/Enter a positive multiplier/)
    ).toBeInTheDocument()
    expect(api.addExerciseVariant).not.toHaveBeenCalled()
  })

  it("confirms archive and leaves the item visibly archived", async () => {
    api.removeExerciseVariant.mockResolvedValue({ ok: true, value: {} })
    render(<ExerciseLibraryManager initialCategories={[category]} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Archive Band assisted" })
    )

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "will remain in existing templates and workout history"
    )
    fireEvent.click(screen.getByRole("button", { name: "Archive" }))

    await waitFor(() =>
      expect(api.removeExerciseVariant).toHaveBeenCalledWith({
        data: { id: "variant-1" },
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(screen.getByText("Archived")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Archive Band assisted" })
    ).not.toBeInTheDocument()
  })

  it("renders archived categories without restoration controls", () => {
    render(
      <ExerciseLibraryManager
        initialCategories={[{ ...category, archivedAt: "2026-08-17" }]}
      />
    )
    expect(screen.getAllByText("Archived")).toHaveLength(2)
    expect(
      screen.queryByRole("button", { name: /Edit Pull-up/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Restore")).not.toBeInTheDocument()
  })

  it("announces a failed save and keeps the editor open", async () => {
    api.addExerciseCategory.mockRejectedValue(new Error("offline"))
    render(<ExerciseLibraryManager initialCategories={[]} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Add your first category" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Dip" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t save")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
