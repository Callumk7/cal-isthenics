import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ExerciseLibraryManager } from "../library-manager"

const api = vi.hoisted(() => ({
  addExerciseCategory: vi.fn(),
  addExerciseVariant: vi.fn(),
  removeExerciseCategory: vi.fn(),
  removeExerciseVariant: vi.fn(),
  restoreExerciseCategory: vi.fn(),
  restoreExerciseVariant: vi.fn(),
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

  it("restores an archived category without restoring individually archived variants", async () => {
    const individuallyArchived = {
      ...category.variants[0],
      archivedAt: "2026-08-16",
    }
    api.restoreExerciseCategory.mockResolvedValue({ ok: true, value: {} })
    const onLibraryChanged = vi.fn()
    render(
      <ExerciseLibraryManager
        onLibraryChanged={onLibraryChanged}
        initialCategories={[
          {
            ...category,
            archivedAt: "2026-08-17",
            variants: [individuallyArchived],
          },
        ]}
      />
    )

    expect(screen.getByText("Restore the category first.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Restore Pull-up" }))

    await waitFor(() =>
      expect(api.restoreExerciseCategory).toHaveBeenCalledWith({
        data: { id: "category-1" },
      })
    )
    expect(screen.getByRole("status")).toHaveTextContent("Pull-up restored.")
    expect(onLibraryChanged).toHaveBeenCalledOnce()
    // The category is active, but the variant is still individually archived
    // and can now be restored explicitly.
    expect(
      screen.getByRole("button", { name: "Restore Band assisted" })
    ).toBeInTheDocument()
    expect(screen.getByText("Archived")).toBeInTheDocument()
  })

  it("keeps restore accessible after a failed request so it can be retried", async () => {
    api.restoreExerciseVariant
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, value: {} })
    render(
      <ExerciseLibraryManager
        initialCategories={[
          {
            ...category,
            variants: [{ ...category.variants[0], archivedAt: "2026-08-17" }],
          },
        ]}
      />
    )

    const restoreButton = screen.getByRole("button", {
      name: "Restore Band assisted",
    })
    expect(restoreButton).toHaveClass("h-11")
    fireEvent.click(restoreButton)
    expect(await screen.findByRole("status")).toHaveTextContent(
      "could not be restored"
    )
    expect(
      screen.getByRole("button", { name: "Restore Band assisted" })
    ).toBeEnabled()

    fireEvent.click(
      screen.getByRole("button", { name: "Restore Band assisted" })
    )
    await waitFor(() =>
      expect(api.restoreExerciseVariant).toHaveBeenCalledTimes(2)
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Band assisted restored."
    )
    expect(
      screen.getByRole("button", { name: "Archive Band assisted" })
    ).toBeInTheDocument()
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
