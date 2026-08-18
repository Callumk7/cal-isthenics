import { useMemo, useRef, useState } from "react"

import { Button, LinkButton } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isValidCalendarDate, localCalendarToday } from "@/lib/date"
import { createRunningWorkout } from "@/running/server-functions"
import type { RunningWorkout } from "@/running/running-workouts"

const decimalPattern = /^\d+(?:\.\d{1,3})?$/
const wholeNumberPattern = /^\d+$/

type Errors = Partial<
  Record<
    | "workoutDate"
    | "distanceKm"
    | "durationSeconds"
    | "calories"
    | "manualSpeedKmH",
    string
  >
>

type FormState = {
  workoutDate: string
  distanceKm: string
  hours: string
  minutes: string
  seconds: string
  calories: string
  manualSpeedKmH: string
}

const initialForm = (): FormState => ({
  workoutDate: localCalendarToday(),
  distanceKm: "",
  hours: "",
  minutes: "",
  seconds: "",
  calories: "",
  manualSpeedKmH: "",
})

function parseDuration(state: FormState) {
  const parts = [state.hours, state.minutes, state.seconds]
  if (
    parts.some((part) => part.trim() === "" || !wholeNumberPattern.test(part))
  )
    return null
  const hours = Number(state.hours)
  const minutes = Number(state.minutes)
  const seconds = Number(state.seconds)
  if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59)
    return null
  const total = hours * 3600 + minutes * 60 + seconds
  return Number.isSafeInteger(total) ? total : null
}

function fieldId(field: keyof Errors) {
  return `run-${field}`
}

function errorId(field: keyof Errors) {
  return `${fieldId(field)}-error`
}

function validate(state: FormState) {
  const errors: Errors = {}
  const distance = state.distanceKm.trim()
  const calories = state.calories.trim()
  const manualSpeed = state.manualSpeedKmH.trim()
  const durationSeconds = parseDuration(state)

  if (!isValidCalendarDate(state.workoutDate)) {
    errors.workoutDate = "Enter a valid calendar date."
  }
  if (!decimalPattern.test(distance) || Number(distance) <= 0) {
    errors.distanceKm =
      "Enter a positive distance in kilometres with up to three decimal places."
  }
  if (durationSeconds === null || durationSeconds < 1) {
    errors.durationSeconds =
      "Enter a duration of at least 1 second using whole hours, minutes, and seconds."
  }
  if (!wholeNumberPattern.test(calories) || Number(calories) <= 0) {
    errors.calories = "Enter positive whole-number calories."
  }
  if (
    manualSpeed !== "" &&
    (!decimalPattern.test(manualSpeed) || Number(manualSpeed) <= 0)
  ) {
    errors.manualSpeedKmH =
      "Enter a positive speed in km/h with up to three decimal places."
  }

  return { errors, durationSeconds }
}

function hasErrors(errors: Errors) {
  return Object.values(errors).some(Boolean)
}

export function RunRecorder() {
  const [form, setForm] = useState<FormState>(() => initialForm())
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [status, setStatus] = useState("")
  const [saved, setSaved] = useState<RunningWorkout | null>(null)
  const [savedIds, setSavedIds] = useState<string[]>([])

  const durationSeconds = parseDuration(form)
  const validDistance = decimalPattern.test(form.distanceKm.trim())
    ? Number(form.distanceKm)
    : null
  const calculatedSpeed =
    validDistance && validDistance > 0 && durationSeconds && durationSeconds > 0
      ? (validDistance * 3600) / durationSeconds
      : null
  const manualSpeed =
    form.manualSpeedKmH.trim() !== "" &&
    decimalPattern.test(form.manualSpeedKmH.trim()) &&
    Number(form.manualSpeedKmH) > 0
      ? Number(form.manualSpeedKmH)
      : null
  const preview = useMemo(
    () => ({
      calculated: calculatedSpeed?.toFixed(2) ?? "–",
      manual: manualSpeed?.toFixed(2) ?? null,
    }),
    [calculatedSpeed, manualSpeed]
  )

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      const next = { ...current }
      const errorField =
        field === "hours" || field === "minutes" || field === "seconds"
          ? "durationSeconds"
          : field
      delete next[errorField as keyof Errors]
      return next
    })
    setStatus("")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    const validation = validate(form)
    setErrors(validation.errors)
    setStatus("")
    if (hasErrors(validation.errors) || !validation.durationSeconds) return

    savingRef.current = true
    setSaving(true)
    try {
      const override = form.manualSpeedKmH.trim()
      const result = await createRunningWorkout({
        data: {
          workoutDate: form.workoutDate,
          distanceKm: form.distanceKm.trim(),
          durationSeconds: validation.durationSeconds,
          calories: form.calories.trim(),
          manualSpeedKmH: override || undefined,
        },
      })
      if (result.ok) {
        setSaved(result.value)
        setSavedIds((current) => [...current, result.value.id])
        return
      }
      if (result.error === "validation") {
        setErrors(result.fieldErrors ?? {})
        return
      }
      setStatus("We couldn’t save this run. Please try again.")
    } catch {
      setStatus("We couldn’t save this run. Please try again.")
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
        <section className="border p-6" aria-labelledby="run-saved-heading">
          <p className="mb-1 text-xs font-medium tracking-widest text-primary uppercase">
            Run saved
          </p>
          <h1 id="run-saved-heading" className="text-2xl font-semibold">
            Running workout saved
          </h1>
          <p className="mt-3 text-sm break-all text-muted-foreground">
            Run ID:{" "}
            <span className="font-medium text-foreground">{saved.id}</span>
          </p>
          <div className="mt-4" aria-labelledby="saved-run-ids-heading">
            <h2 id="saved-run-ids-heading" className="text-sm font-medium">
              Saved run IDs this session
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {savedIds.map((id) => (
                <li key={id} className="break-all">
                  {id}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="h-11"
              onPress={() => {
                setSaved(null)
                setForm(initialForm())
                setErrors({})
                setStatus("")
              }}
            >
              Record another run
            </Button>
            <LinkButton
              className="h-11"
              variant="outline"
              to="/record/run/$runId"
              params={{ runId: saved.id } as never}
            >
              Edit this run
            </LinkButton>
            <LinkButton className="h-11" variant="outline" to="/record">
              Back to Record
            </LinkButton>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <header className="mb-6">
        <p className="mb-1 text-xs font-medium tracking-widest text-primary uppercase">
          Training log
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Record a run</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log distance, duration, calories, and an optional manual speed.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.workoutDate}>
            <FieldLabel htmlFor={fieldId("workoutDate")}>Date</FieldLabel>
            <Input
              id={fieldId("workoutDate")}
              className="h-11 text-base md:text-sm"
              type="date"
              value={form.workoutDate}
              aria-invalid={!!errors.workoutDate}
              aria-describedby={
                errors.workoutDate ? errorId("workoutDate") : undefined
              }
              onChange={(event) => update("workoutDate", event.target.value)}
            />
            <FieldError id={errorId("workoutDate")}>
              {errors.workoutDate}
            </FieldError>
          </Field>

          <Field data-invalid={!!errors.distanceKm}>
            <FieldLabel htmlFor={fieldId("distanceKm")}>
              Distance (km)
            </FieldLabel>
            <Input
              id={fieldId("distanceKm")}
              className="h-11 text-base md:text-sm"
              type="text"
              inputMode="decimal"
              value={form.distanceKm}
              aria-invalid={!!errors.distanceKm}
              aria-describedby={
                errors.distanceKm ? errorId("distanceKm") : undefined
              }
              onChange={(event) => update("distanceKm", event.target.value)}
            />
            <FieldError id={errorId("distanceKm")}>
              {errors.distanceKm}
            </FieldError>
          </Field>

          <FieldSet
            className="gap-2"
            aria-describedby={
              errors.durationSeconds ? errorId("durationSeconds") : undefined
            }
          >
            <FieldLegend>Duration</FieldLegend>
            <div className="flex flex-wrap gap-3">
              <Field className="min-w-0 flex-1 basis-24">
                <FieldLabel htmlFor="run-hours">Hours</FieldLabel>
                <Input
                  id="run-hours"
                  className="h-11 text-base md:text-sm"
                  type="text"
                  inputMode="numeric"
                  value={form.hours}
                  aria-invalid={!!errors.durationSeconds}
                  onChange={(event) => update("hours", event.target.value)}
                />
              </Field>
              <Field className="min-w-0 flex-1 basis-24">
                <FieldLabel htmlFor="run-minutes">Minutes</FieldLabel>
                <Input
                  id="run-minutes"
                  className="h-11 text-base md:text-sm"
                  type="text"
                  inputMode="numeric"
                  value={form.minutes}
                  aria-invalid={!!errors.durationSeconds}
                  onChange={(event) => update("minutes", event.target.value)}
                />
              </Field>
              <Field className="min-w-0 flex-1 basis-24">
                <FieldLabel htmlFor="run-seconds">Seconds</FieldLabel>
                <Input
                  id="run-seconds"
                  className="h-11 text-base md:text-sm"
                  type="text"
                  inputMode="numeric"
                  value={form.seconds}
                  aria-invalid={!!errors.durationSeconds}
                  onChange={(event) => update("seconds", event.target.value)}
                />
              </Field>
            </div>
            <FieldDescription>
              Minutes and seconds must be between 0 and 59.
            </FieldDescription>
            <FieldError id={errorId("durationSeconds")}>
              {errors.durationSeconds}
            </FieldError>
          </FieldSet>

          <Field data-invalid={!!errors.calories}>
            <FieldLabel htmlFor={fieldId("calories")}>Calories</FieldLabel>
            <Input
              id={fieldId("calories")}
              className="h-11 text-base md:text-sm"
              type="text"
              inputMode="numeric"
              value={form.calories}
              aria-invalid={!!errors.calories}
              aria-describedby={
                errors.calories ? errorId("calories") : undefined
              }
              onChange={(event) => update("calories", event.target.value)}
            />
            <FieldError id={errorId("calories")}>{errors.calories}</FieldError>
          </Field>

          <Field data-invalid={!!errors.manualSpeedKmH}>
            <FieldLabel htmlFor={fieldId("manualSpeedKmH")}>
              Manual speed (km/h) (optional)
            </FieldLabel>
            <Input
              id={fieldId("manualSpeedKmH")}
              className="h-11 text-base md:text-sm"
              type="text"
              inputMode="decimal"
              value={form.manualSpeedKmH}
              aria-invalid={!!errors.manualSpeedKmH}
              aria-describedby={
                errors.manualSpeedKmH ? errorId("manualSpeedKmH") : undefined
              }
              onChange={(event) => update("manualSpeedKmH", event.target.value)}
            />
            <FieldError id={errorId("manualSpeedKmH")}>
              {errors.manualSpeedKmH}
            </FieldError>
          </Field>
        </FieldGroup>

        <section
          className="border bg-muted/30 p-4"
          aria-labelledby="speed-preview-heading"
          aria-live="polite"
        >
          <h2 id="speed-preview-heading" className="font-medium">
            Speed preview
          </h2>
          <p className="mt-2 text-sm">
            Calculated average speed:{" "}
            {preview.calculated === "–" ? "–" : `${preview.calculated} km/h`}
          </p>
          {preview.manual && (
            <p className="mt-1 text-sm">
              Effective speed: {preview.manual} km/h (manual)
            </p>
          )}
        </section>

        {status && (
          <p className="text-sm text-destructive" role="alert">
            {status}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button className="h-11" type="submit" isDisabled={saving}>
            {saving ? "Saving…" : "Save run"}
          </Button>
          <LinkButton className="h-11" variant="outline" to="/record">
            Back to Record
          </LinkButton>
        </div>
      </form>
    </main>
  )
}
