import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RunEditor } from "../run-editor"

const mocks = vi.hoisted(() => ({
  updateRunningWorkout: vi.fn(),
  deleteRunningWorkout: vi.fn(),
}))

vi.mock("@/running/server-functions", () => ({
  updateRunningWorkout: mocks.updateRunningWorkout,
  deleteRunningWorkout: mocks.deleteRunningWorkout,
}))
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
    <a href={to.replace("$runId", params?.runId ?? "")} {...props}>
      {children}
    </a>
  ),
}))

function run(overrides = {}) {
  return {
    id: "run-1",
    userId: "user",
    workoutDate: "2026-08-18",
    distanceMetres: 5000,
    durationSeconds: 3723,
    calories: 300,
    manualSpeedMilliKmH: 12500,
    calculatedAverageSpeedKmH: 4.83,
    effectiveAverageSpeedKmH: 12.5,
    runningIntensity: 24.15,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function renderEditor(onSaved = vi.fn(), onDeleted = vi.fn()) {
  render(<RunEditor run={run()} onSaved={onSaved} onDeleted={onDeleted} />)
  return { onSaved, onDeleted }
}

function confirmDelete() {
  const buttons = screen.getAllByRole("button", { name: /delete run/i })
  return buttons[buttons.length - 1]
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("RunEditor", () => {
  it("hydrates saved values into the form", () => {
    renderEditor()
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-18")
    expect(screen.getByLabelText("Distance (km)")).toHaveValue("5")
    expect(screen.getByLabelText("Hours")).toHaveValue("1")
    expect(screen.getByLabelText("Minutes")).toHaveValue("2")
    expect(screen.getByLabelText("Seconds")).toHaveValue("3")
    expect(screen.getByLabelText("Calories")).toHaveValue("300")
    expect(screen.getByLabelText("Manual speed (km/h) (optional)")).toHaveValue(
      "12.5"
    )
  })

  it("previews calculated speed and uses the manual speed until it is cleared", async () => {
    const user = userEvent.setup()
    renderEditor()
    expect(
      screen.getByText(/calculated average speed: 4\.83 km\/h/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/effective speed: 12\.50 km\/h \(manual\)/i)
    ).toBeInTheDocument()
    await user.clear(screen.getByLabelText("Manual speed (km/h) (optional)"))
    expect(
      screen.getByText(/effective speed: 4\.83 km\/h/i)
    ).toBeInTheDocument()
  })

  it("shows client validation errors and does not submit invalid values", async () => {
    const user = userEvent.setup()
    renderEditor()
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-02-30" },
    })
    for (const [label, value] of [
      ["Distance (km)", "1.2345"],
      ["Hours", "0"],
      ["Minutes", "0"],
      ["Seconds", "0"],
      ["Calories", "0"],
      ["Manual speed (km/h) (optional)", "4.1234"],
    ]) {
      await user.clear(screen.getByLabelText(label))
      await user.type(screen.getByLabelText(label), value)
    }
    await user.click(screen.getByRole("button", { name: /save changes/i }))
    expect(mocks.updateRunningWorkout).not.toHaveBeenCalled()
    for (const label of [
      "Date",
      "Distance (km)",
      "Hours",
      "Calories",
      "Manual speed (km/h) (optional)",
    ])
      expect(screen.getByLabelText(label)).toHaveAttribute(
        "aria-invalid",
        "true"
      )
    expect(screen.getByText(/enter a valid calendar date/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /positive distance in kilometres with up to three decimal/i
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/at least 1 second/i)).toBeInTheDocument()
    expect(
      screen.getByText(/positive whole-number calories/i)
    ).toBeInTheDocument()
  })

  it("submits trimmed values and sends an empty manual speed to clear it", async () => {
    const user = userEvent.setup()
    const saved = run({ manualSpeedMilliKmH: null })
    mocks.updateRunningWorkout.mockResolvedValue({ ok: true, value: saved })
    const { onSaved } = renderEditor()
    await user.clear(screen.getByLabelText("Distance (km)"))
    await user.type(screen.getByLabelText("Distance (km)"), " 6.25 ")
    await user.clear(screen.getByLabelText("Calories"))
    await user.type(screen.getByLabelText("Calories"), " 350 ")
    await user.clear(screen.getByLabelText("Manual speed (km/h) (optional)"))
    await user.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() =>
      expect(mocks.updateRunningWorkout).toHaveBeenCalledOnce()
    )
    expect(mocks.updateRunningWorkout).toHaveBeenCalledWith({
      data: {
        id: "run-1",
        workoutDate: "2026-08-18",
        distanceKm: "6.25",
        durationSeconds: 3723,
        calories: "350",
        manualSpeedKmH: "",
      },
    })
    expect(onSaved).toHaveBeenCalledWith(saved)
  })

  it("maps server validation errors to fields", async () => {
    mocks.updateRunningWorkout.mockResolvedValue({
      ok: false,
      error: "validation",
      fieldErrors: { distanceKm: "Distance rejected by server." },
    })
    const user = userEvent.setup()
    renderEditor()
    await user.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Distance rejected by server."
    )
    expect(screen.getByLabelText("Distance (km)")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("deletes only after confirmation and can cancel", async () => {
    mocks.deleteRunningWorkout.mockResolvedValue({
      ok: true,
      value: { id: "run-1" },
    })
    const user = userEvent.setup()
    const { onDeleted } = renderEditor()
    await user.click(screen.getByRole("button", { name: /^delete run$/i }))
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Delete run?")
    await user.click(screen.getByRole("button", { name: /cancel/i }))
    expect(mocks.deleteRunningWorkout).not.toHaveBeenCalled()
    expect(screen.queryByText("Delete run?")).toBeNull()

    await user.click(screen.getByRole("button", { name: /^delete run$/i }))
    await user.click(confirmDelete())
    await waitFor(() =>
      expect(mocks.deleteRunningWorkout).toHaveBeenCalledOnce()
    )
    expect(mocks.deleteRunningWorkout).toHaveBeenCalledWith({
      data: { id: "run-1" },
    })
    expect(onDeleted).toHaveBeenCalledOnce()
  })

  it("deduplicates pending delete submissions", async () => {
    mocks.deleteRunningWorkout.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderEditor()
    await user.click(screen.getByRole("button", { name: /^delete run$/i }))
    const button = confirmDelete()
    await Promise.all([user.click(button), user.click(button)])
    expect(mocks.deleteRunningWorkout).toHaveBeenCalledOnce()
  })

  it("shows a recoverable error when deletion fails", async () => {
    mocks.deleteRunningWorkout.mockResolvedValue({
      ok: false,
      error: "not_found",
    })
    const user = userEvent.setup()
    const { onDeleted } = renderEditor()
    await user.click(screen.getByRole("button", { name: /^delete run$/i }))
    await user.click(confirmDelete())
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn’t delete"
    )
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
