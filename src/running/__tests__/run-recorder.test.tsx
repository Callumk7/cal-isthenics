import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RunRecorder } from "../run-recorder"

const mocks = vi.hoisted(() => ({
  createRunningWorkout: vi.fn(),
}))

vi.mock("@/running/server-functions", () => ({
  createRunningWorkout: mocks.createRunningWorkout,
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

function run(id: string) {
  return {
    id,
    userId: "user",
    workoutDate: "2026-08-18",
    distanceMetres: 5000,
    durationSeconds: 1800,
    calories: 300,
    manualSpeedMilliKmH: null,
    calculatedAverageSpeedKmH: 10,
    effectiveAverageSpeedKmH: 10,
    runningIntensity: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

async function fillValid(user = userEvent.setup(), shouldRender = true) {
  if (shouldRender) render(<RunRecorder />)
  await user.clear(screen.getByLabelText("Date"))
  await user.type(screen.getByLabelText("Date"), "2026-08-18")
  await user.type(screen.getByLabelText("Distance (km)"), "15.25")
  await user.type(screen.getByLabelText("Hours"), "1")
  await user.type(screen.getByLabelText("Minutes"), "30")
  await user.type(screen.getByLabelText("Seconds"), "5")
  await user.type(screen.getByLabelText("Calories"), "450")
  return user
}

/** Asserts the persisted run ID is rendered inside the saved-result region. */
async function expectSavedRunId(id: string) {
  const region = await screen.findByRole("region", {
    name: /running workout saved/i,
  })
  const runIdLine = within(region).getByText(/^Run ID:/)
  expect(runIdLine).toHaveTextContent(id)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("RunRecorder", () => {
  it("defaults the date to today's local-calendar date", () => {
    render(<RunRecorder />)
    const expected = new Date(
      Date.now() - new Date().getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 10)
    expect(screen.getByLabelText("Date")).toHaveValue(expected)
  })

  it("links to edit the saved run", async () => {
    mocks.createRunningWorkout.mockResolvedValue({
      ok: true,
      value: run("run-1"),
    })
    const user = await fillValid()
    await user.click(screen.getByRole("button", { name: /save run/i }))
    await expectSavedRunId("run-1")
    expect(
      screen.getByRole("link", { name: /edit this run/i })
    ).toHaveAttribute("href", "/record/run/run-1")
  })

  it("normalizes hours, minutes, and seconds into exact total seconds", async () => {
    mocks.createRunningWorkout.mockResolvedValue({
      ok: true,
      value: run("run-1"),
    })
    const user = await fillValid()
    await user.click(screen.getByRole("button", { name: /save run/i }))
    await waitFor(() =>
      expect(mocks.createRunningWorkout).toHaveBeenCalledOnce()
    )
    expect(mocks.createRunningWorkout).toHaveBeenCalledWith({
      data: {
        workoutDate: "2026-08-18",
        distanceKm: "15.25",
        durationSeconds: 5405,
        calories: "450",
        manualSpeedKmH: undefined,
      },
    })
    await expectSavedRunId("run-1")
  })

  it("previews calculated speed and uses a placeholder when incomplete", async () => {
    const user = userEvent.setup()
    render(<RunRecorder />)
    expect(screen.getByText(/calculated average speed: –/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText("Distance (km)"), "5")
    await user.type(screen.getByLabelText("Hours"), "0")
    await user.type(screen.getByLabelText("Minutes"), "30")
    await user.type(screen.getByLabelText("Seconds"), "0")
    expect(
      screen.getByText(/calculated average speed: 10\.00 km\/h/i)
    ).toBeInTheDocument()
  })

  it("adds, updates, and removes a manual speed without changing calculated speed", async () => {
    const user = userEvent.setup()
    render(<RunRecorder />)
    await user.type(screen.getByLabelText("Distance (km)"), "5")
    await user.type(screen.getByLabelText("Hours"), "0")
    await user.type(screen.getByLabelText("Minutes"), "30")
    await user.type(screen.getByLabelText("Seconds"), "0")
    const manual = screen.getByLabelText("Manual speed (km/h) (optional)")
    await user.type(manual, "12.5")
    expect(
      screen.getByText(/calculated average speed: 10\.00 km\/h/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/effective speed: 12\.50 km\/h \(manual\)/i)
    ).toBeInTheDocument()
    await user.clear(manual)
    await user.type(manual, "11")
    expect(
      screen.getByText(/calculated average speed: 10\.00 km\/h/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/effective speed: 11\.00 km\/h \(manual\)/i)
    ).toBeInTheDocument()
    await user.clear(manual)
    expect(screen.queryByText(/effective speed:/i)).toBeNull()
    expect(
      screen.getByText(/calculated average speed: 10\.00 km\/h/i)
    ).toBeInTheDocument()
  })

  it("announces validation errors and never calls the server for invalid fields", async () => {
    const user = userEvent.setup()
    render(<RunRecorder />)
    await user.type(screen.getByLabelText("Distance (km)"), "1.2345")
    await user.type(screen.getByLabelText("Hours"), "0")
    await user.type(screen.getByLabelText("Minutes"), "0")
    await user.type(screen.getByLabelText("Seconds"), "0")
    await user.type(screen.getByLabelText("Calories"), "0")
    await user.type(
      screen.getByLabelText("Manual speed (km/h) (optional)"),
      "4.1234"
    )
    await user.click(screen.getByRole("button", { name: /save run/i }))
    expect(mocks.createRunningWorkout).not.toHaveBeenCalled()
    expect(screen.getAllByRole("alert")).toHaveLength(4)
    expect(screen.getByLabelText("Distance (km)")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(screen.getByLabelText("Hours")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("rejects a non-existent calendar date inline before any server call", async () => {
    const user = userEvent.setup()
    render(<RunRecorder />)
    await user.clear(screen.getByLabelText("Date"))
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-02-30" },
    })
    await user.type(screen.getByLabelText("Distance (km)"), "10")
    await user.type(screen.getByLabelText("Hours"), "1")
    await user.type(screen.getByLabelText("Minutes"), "0")
    await user.type(screen.getByLabelText("Seconds"), "0")
    await user.type(screen.getByLabelText("Calories"), "400")
    await user.click(screen.getByRole("button", { name: /save run/i }))
    expect(mocks.createRunningWorkout).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Date")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(screen.getByText(/enter a valid calendar date/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Distance (km)")).toHaveValue("10")
  })

  it("deduplicates pending submissions", async () => {
    let resolve!: (value: unknown) => void
    mocks.createRunningWorkout.mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    const user = await fillValid()
    const button = screen.getByRole("button", { name: /save run/i })
    await Promise.all([user.click(button), user.click(button)])
    expect(mocks.createRunningWorkout).toHaveBeenCalledOnce()
    resolve({ ok: true, value: run("run-once") })
    await expectSavedRunId("run-once")
  })

  it("allows same-date submissions to surface distinct persisted ids", async () => {
    mocks.createRunningWorkout
      .mockResolvedValueOnce({ ok: true, value: run("run-a") })
      .mockResolvedValueOnce({ ok: true, value: run("run-b") })
    const user = await fillValid()
    await user.click(screen.getByRole("button", { name: /save run/i }))
    await expectSavedRunId("run-a")
    await user.click(
      screen.getByRole("button", { name: /record another run/i })
    )
    await fillValid(user, false)
    await user.click(screen.getByRole("button", { name: /save run/i }))
    await expectSavedRunId("run-b")
    expect(mocks.createRunningWorkout).toHaveBeenCalledTimes(2)
    expect(mocks.createRunningWorkout.mock.calls[0][0].data.workoutDate).toBe(
      mocks.createRunningWorkout.mock.calls[1][0].data.workoutDate
    )
  })

  it("preserves values after recoverable failure and retries successfully", async () => {
    mocks.createRunningWorkout
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: true, value: run("retry-run") })
    const user = await fillValid()
    await user.click(screen.getByRole("button", { name: /save run/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t save")
    expect(screen.getByLabelText("Distance (km)")).toHaveValue("15.25")
    expect(
      screen.queryByRole("heading", { name: /running workout saved/i })
    ).toBeNull()
    await user.click(screen.getByRole("button", { name: /save run/i }))
    await expectSavedRunId("retry-run")
  })

  it("maps server validation errors to fields", async () => {
    mocks.createRunningWorkout.mockResolvedValue({
      ok: false,
      error: "validation",
      fieldErrors: { distanceKm: "Distance rejected by server." },
    })
    const user = await fillValid()
    await user.click(screen.getByRole("button", { name: /save run/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Distance rejected by server."
    )
    expect(screen.getByLabelText("Distance (km)")).toHaveAttribute(
      "aria-describedby",
      "run-distanceKm-error"
    )
  })

  it("is label-associated, keyboard operable, submits on Enter, and fits 320px", async () => {
    mocks.createRunningWorkout.mockResolvedValue({
      ok: true,
      value: run("keyboard-run"),
    })
    const user = userEvent.setup()
    const { container } = render(
      <div style={{ width: 320, overflowX: "auto" }}>
        <RunRecorder />
      </div>
    )
    for (const label of [
      "Date",
      "Distance (km)",
      "Hours",
      "Minutes",
      "Seconds",
      "Calories",
      "Manual speed (km/h) (optional)",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    await user.tab()
    expect(screen.getByLabelText("Date")).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText("Distance (km)")).toHaveFocus()
    await user.type(screen.getByLabelText("Distance (km)"), "5")
    await user.type(screen.getByLabelText("Hours"), "0")
    await user.type(screen.getByLabelText("Minutes"), "30")
    await user.type(screen.getByLabelText("Seconds"), "0")
    await user.type(screen.getByLabelText("Calories"), "300{enter}")
    await expectSavedRunId("keyboard-run")
    expect(container.firstElementChild?.scrollWidth ?? 0).toBeLessThanOrEqual(
      320
    )
    expect(
      within(container).getByRole("link", { name: /back to record/i })
    ).toHaveAttribute("href", "/record")
  })
})
