import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TemplateManager } from "../template-manager"

const api = vi.hoisted(() => ({
  createWorkoutTemplate: vi.fn(),
  updateWorkoutTemplate: vi.fn(),
  deleteWorkoutTemplate: vi.fn(),
  readWorkoutTemplate: vi.fn(),
}))

vi.mock("../server-functions", () => api)

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

const category = {
  id: "cat-push",
  name: "Push",
  archivedAt: null,
  variants: [
    {
      id: "variant-push-up",
      categoryId: "cat-push",
      name: "Push-up",
      difficultyMultiplier: 1,
      archivedAt: null,
    },
    {
      id: "variant-dips",
      categoryId: "cat-push",
      name: "Dips",
      difficultyMultiplier: 1,
      archivedAt: null,
    },
  ],
}

const archivedCategory = {
  id: "cat-old",
  name: "Old",
  archivedAt: "2026-08-01",
  variants: [
    {
      id: "variant-arms-only",
      categoryId: "cat-old",
      name: "Arms-only",
      difficultyMultiplier: 1,
      archivedAt: "2026-08-01",
    },
  ],
}

const summary = {
  id: "template-1",
  name: "Push day",
  updatedAt: new Date("2026-08-01"),
  exerciseCount: 2,
  canStart: false,
}

const detail = {
  id: "template-1",
  name: "Push day",
  userId: "user-1",
  createdAt: new Date("2026-08-01"),
  updatedAt: new Date("2026-08-01"),
  canStart: false,
  exercises: [
    {
      id: "ex-1",
      position: 0,
      setCount: 3,
      variantId: "variant-push-up",
      variantName: "Push-up",
      difficultyMultiplier: 1,
      variantArchived: false,
      categoryId: "cat-push",
      categoryName: "Push",
      categoryArchived: false,
      archived: false,
    },
    {
      id: "ex-2",
      position: 1,
      setCount: 3,
      variantId: "variant-arms-only",
      variantName: "Arms-only",
      difficultyMultiplier: 1,
      variantArchived: true,
      categoryId: "cat-old",
      categoryName: "Old",
      categoryArchived: true,
      archived: true,
    },
  ],
}

describe("TemplateManager", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
  })

  it("shows the empty-library state and does not offer create", () => {
    render(<TemplateManager initialTemplates={[]} initialLibrary={[]} />)

    expect(
      screen.getByText("Build your exercise library first")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "New template" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Create your first template" })
    ).not.toBeInTheDocument()
  })

  it("treats a library with only archived items as empty", () => {
    render(
      <TemplateManager
        initialTemplates={[]}
        initialLibrary={[archivedCategory]}
      />
    )

    expect(
      screen.getByText("Build your exercise library first")
    ).toBeInTheDocument()
  })

  it("shows the empty-template state and opens the editor", async () => {
    render(
      <TemplateManager initialTemplates={[]} initialLibrary={[category]} />
    )

    expect(screen.getByText("No templates yet")).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )

    expect(await screen.findByRole("dialog")).toHaveTextContent("New template")
  })

  it("creates a template with an exercise row and announces it", async () => {
    api.createWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: {
        id: "new-1",
        name: "My Push",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        canStart: true,
        exercises: [
          {
            id: "n1",
            position: 0,
            setCount: 5,
            variantId: "variant-push-up",
            variantName: "Push-up",
            difficultyMultiplier: 1,
            variantArchived: false,
            categoryId: "cat-push",
            categoryName: "Push",
            categoryArchived: false,
            archived: false,
          },
        ],
      },
    })
    render(
      <TemplateManager initialTemplates={[]} initialLibrary={[category]} />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "My Push" },
    })
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))
    fireEvent.change(screen.getByLabelText("Sets"), {
      target: { value: "5" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(api.createWorkoutTemplate).toHaveBeenCalledWith({
      data: {
        name: "My Push",
        exercises: [{ variantId: "variant-push-up", setCount: 5 }],
      },
    })
    expect(
      await screen.findByRole("heading", { name: "My Push" })
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("My Push saved.")
  })

  it("adds the same variant twice as distinct rows and removes them independently", () => {
    render(
      <TemplateManager initialTemplates={[]} initialLibrary={[category]} />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))

    expect(screen.getAllByLabelText("Sets")).toHaveLength(2)
    const removeButtons = screen.getAllByRole("button", {
      name: "Remove Push-up",
    })
    expect(removeButtons).toHaveLength(2)

    fireEvent.click(removeButtons[0])
    expect(screen.getAllByLabelText("Sets")).toHaveLength(1)
    expect(
      screen.getAllByRole("button", { name: "Remove Push-up" })
    ).toHaveLength(1)
  })

  it("reorders rows and saves in the new order", async () => {
    api.createWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: {
        id: "t",
        name: "Push day",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        canStart: true,
        exercises: [],
      },
    })
    render(
      <TemplateManager initialTemplates={[]} initialLibrary={[category]} />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Push day" },
    })
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-dips" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))

    fireEvent.click(screen.getByRole("button", { name: 'Move "Push-up" down' }))

    expect(
      screen.getByRole("button", { name: 'Move "Dips" up' })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: 'Move "Push-up" down' })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: 'Move "Push-up" up' })
    ).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(api.createWorkoutTemplate).toHaveBeenCalledWith({
      data: {
        name: "Push day",
        exercises: [
          { variantId: "variant-dips", setCount: 3 },
          { variantId: "variant-push-up", setCount: 3 },
        ],
      },
    })
  })

  it("validates set counts inline and saves valid values", async () => {
    api.createWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: {
        id: "t",
        name: "My Push",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        canStart: true,
        exercises: [],
      },
    })
    render(
      <TemplateManager initialTemplates={[]} initialLibrary={[category]} />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "My Push" },
    })
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))

    for (const bad of ["0", "-1", "1.5", "", "2x"]) {
      fireEvent.change(screen.getByLabelText("Sets"), {
        target: { value: bad },
      })
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
      expect(
        await screen.findByText("Enter a positive whole number of sets.")
      ).toBeInTheDocument()
      expect(api.createWorkoutTemplate).not.toHaveBeenCalled()
    }

    fireEvent.change(screen.getByLabelText("Sets"), {
      target: { value: "5" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(api.createWorkoutTemplate).toHaveBeenCalledWith({
      data: {
        name: "My Push",
        exercises: [{ variantId: "variant-push-up", setCount: 5 }],
      },
    })
  })

  it("edits a template, keeping archived rows visible and saving the rename", async () => {
    api.readWorkoutTemplate.mockResolvedValue(detail)
    api.updateWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: { ...detail, name: "Renamed day" },
    })
    render(
      <TemplateManager
        initialTemplates={[summary]}
        initialLibrary={[category]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Edit Push day" }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Edit template")
    expect(dialog).toHaveTextContent("Push-up")
    expect(dialog).toHaveTextContent("Arms-only")
    expect(screen.getAllByText("Archived")).toHaveLength(1)

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Renamed day" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(api.updateWorkoutTemplate).toHaveBeenCalledWith({
      data: {
        id: "template-1",
        name: "Renamed day",
        exercises: [
          { variantId: "variant-push-up", setCount: 3 },
          { variantId: "variant-arms-only", setCount: 3 },
        ],
      },
    })
    expect(
      await screen.findByRole("heading", { name: "Renamed day" })
    ).toBeInTheDocument()
  })

  it("blocks archived templates, lets the user remove the archived row, and re-enables eligibility", async () => {
    api.readWorkoutTemplate.mockResolvedValue(detail)
    api.updateWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: {
        ...detail,
        canStart: true,
        exercises: detail.exercises.slice(0, 1),
      },
    })
    render(
      <TemplateManager
        initialTemplates={[summary]}
        initialLibrary={[category]}
      />
    )

    expect(screen.getByText("Ineligible")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Contains archived exercises — replace or remove them to use this template."
      )
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit Push day" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(
      "This template can't be started until the archived exercise(s) are removed or replaced."
    )

    fireEvent.click(screen.getByRole("button", { name: "Remove Arms-only" }))
    expect(
      screen.queryByText(
        "This template can't be started until the archived exercise(s) are removed or replaced."
      )
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Archived")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(api.updateWorkoutTemplate).toHaveBeenCalledWith({
      data: {
        id: "template-1",
        name: "Push day",
        exercises: [{ variantId: "variant-push-up", setCount: 3 }],
      },
    })
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(screen.queryByText("Ineligible")).not.toBeInTheDocument()
  })

  it("excludes archived variants and archived categories from the picker", () => {
    render(
      <TemplateManager
        initialTemplates={[]}
        initialLibrary={[category, archivedCategory]}
      />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )

    const picker = screen.getByLabelText("Exercise")
    expect(
      within(picker).getByRole("option", { name: "Push-up" })
    ).toBeInTheDocument()
    expect(
      within(picker).getByRole("option", { name: "Dips" })
    ).toBeInTheDocument()
    expect(
      within(picker).queryByRole("option", { name: "Arms-only" })
    ).not.toBeInTheDocument()
  })

  it("confirms deletion without touching logged workouts and removes the template", async () => {
    api.deleteWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: { id: "template-1" },
    })
    render(
      <TemplateManager
        initialTemplates={[summary]}
        initialLibrary={[category]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete Push day" }))

    const alertDialog = screen.getByRole("alertdialog")
    expect(alertDialog).toHaveTextContent("does not affect logged workouts")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Push day" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete Push day" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(api.deleteWorkoutTemplate).toHaveBeenCalledWith({
      data: { id: "template-1" },
    })
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Push day" })
      ).not.toBeInTheDocument()
    )
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Push day deleted."
    )
  })

  it("keeps the delete dialog open and shows an error when deletion fails, then retries", async () => {
    api.deleteWorkoutTemplate.mockResolvedValue({ ok: false })
    render(
      <TemplateManager
        initialTemplates={[summary]}
        initialLibrary={[category]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete Push day" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(
      await screen.findByText(
        "We couldn’t delete this template. Please try again."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Push day", hidden: true })
    ).toBeInTheDocument()

    api.deleteWorkoutTemplate.mockResolvedValue({
      ok: true,
      value: { id: "template-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(
      screen.queryByRole("heading", { name: "Push day", hidden: true })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Push day deleted."
    )
  })

  it("keeps the delete dialog open and shows an error when deletion rejects", async () => {
    api.deleteWorkoutTemplate.mockRejectedValue(new Error("offline"))
    render(
      <TemplateManager
        initialTemplates={[summary]}
        initialLibrary={[category]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete Push day" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(
      await screen.findByText(
        "We couldn’t delete this template. Please try again."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("shows a save-error banner and keeps the editor open when saving fails", async () => {
    api.createWorkoutTemplate.mockRejectedValue(new Error("offline"))
    render(
      <TemplateManager initialTemplates={[]} initialLibrary={[category]} />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first template" })
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Push day" },
    })
    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "variant-push-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "save your changes"
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
