import { useMemo, useRef, useState } from "react"

import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, LinkButton } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isValidCalendarDate } from "@/lib/date"
import type { RunningWorkout } from "@/running/running-workouts"
import {
  deleteRunningWorkout,
  updateRunningWorkout,
} from "@/running/server-functions"

type FieldName =
  | "workoutDate"
  | "distanceKm"
  | "durationSeconds"
  | "calories"
  | "manualSpeedKmH"
type Errors = Partial<Record<FieldName, string>>
type Form = {
  workoutDate: string
  distanceKm: string
  duration: string
  calories: string
  manualSpeedKmH: string
}
const decimal = /^\d+(?:\.\d{1,3})?$/
const integer = /^\d+$/
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600)
  const minutes = Math.floor((durationSeconds % 3600) / 60)
  const seconds = durationSeconds % 60
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
}

function initialForm(run: RunningWorkout): Form {
  return {
    workoutDate: run.workoutDate,
    distanceKm: String(run.distanceMetres / 1000),
    duration: formatDuration(run.durationSeconds),
    calories: String(run.calories),
    manualSpeedKmH:
      run.manualSpeedMilliKmH === null
        ? ""
        : String(run.manualSpeedMilliKmH / 1000),
  }
}

function duration(value: string) {
  if (!timePattern.test(value)) return null
  const [hours, minutes, seconds = "0"] = value.split(":")
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  return total > 0 ? total : null
}

function validate(form: Form) {
  const errors: Errors = {}
  const seconds = duration(form.duration)
  if (!isValidCalendarDate(form.workoutDate))
    errors.workoutDate = "Enter a valid calendar date."
  if (!decimal.test(form.distanceKm.trim()) || Number(form.distanceKm) <= 0)
    errors.distanceKm =
      "Enter a positive distance in kilometres with up to three decimal places."
  if (seconds === null)
    errors.durationSeconds =
      "Enter a duration from 00:00:01 to 23:59:59 (HH:MM:SS)."
  if (!integer.test(form.calories.trim()) || Number(form.calories) <= 0)
    errors.calories = "Enter positive whole-number calories."
  if (
    form.manualSpeedKmH.trim() &&
    (!decimal.test(form.manualSpeedKmH.trim()) ||
      Number(form.manualSpeedKmH) <= 0)
  )
    errors.manualSpeedKmH =
      "Enter a positive speed in km/h with up to three decimal places."
  return { errors, seconds }
}

export function RunEditor({
  run,
  onSaved,
  onDeleted,
}: {
  run: RunningWorkout
  onSaved: (run: RunningWorkout) => void
  onDeleted: () => void
}) {
  const [form, setForm] = useState(() => initialForm(run))
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)
  const [deleteError, setDeleteError] = useState("")
  const totalSeconds = duration(form.duration)
  const calculated =
    decimal.test(form.distanceKm.trim()) && totalSeconds
      ? (Number(form.distanceKm) * 3600) / totalSeconds
      : null
  const effective =
    decimal.test(form.manualSpeedKmH.trim()) && Number(form.manualSpeedKmH) > 0
      ? Number(form.manualSpeedKmH)
      : calculated
  const preview = useMemo(
    () => ({ calculated, effective }),
    [calculated, effective]
  )

  function change(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    const errorField = field === "duration" ? "durationSeconds" : field
    setErrors((current) => ({ ...current, [errorField]: undefined }))
    setStatus("")
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    const checked = validate(form)
    setErrors(checked.errors)
    if (Object.keys(checked.errors).length || checked.seconds === null) return
    savingRef.current = true
    setSaving(true)
    setStatus("")
    try {
      const result = await updateRunningWorkout({
        data: {
          id: run.id,
          workoutDate: form.workoutDate,
          distanceKm: form.distanceKm.trim(),
          durationSeconds: checked.seconds,
          calories: form.calories.trim(),
          // Empty is intentionally sent, because it means clear rather than retain.
          manualSpeedKmH: form.manualSpeedKmH.trim(),
        },
      })
      if (result.ok) onSaved(result.value)
      else if (result.error === "validation")
        setErrors(result.fieldErrors ?? {})
      else setStatus("We couldn’t save this run. Please try again.")
    } catch {
      setStatus(
        "We couldn’t save this run. Check your connection and try again."
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function remove() {
    if (deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    setDeleteError("")
    try {
      const result = await deleteRunningWorkout({ data: { id: run.id } })
      if (result.ok) onDeleted()
      else setDeleteError("We couldn’t delete this run. Please try again.")
    } catch {
      setDeleteError(
        "We couldn’t delete this run. Check your connection and try again."
      )
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  const input = (
    field: keyof Form,
    label: string,
    props: { inputMode?: "numeric" | "decimal"; type?: string } = {}
  ) => {
    const errorField =
      field === "duration" ? "durationSeconds" : (field as FieldName)
    const id = `run-${field}`
    return (
      <Field data-invalid={!!errors[errorField]}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          className="h-11 text-base md:text-sm"
          value={form[field]}
          aria-invalid={!!errors[errorField]}
          {...props}
          onChange={(event) => change(field, event.target.value)}
        />
        {field !== "duration" && <FieldError>{errors[errorField]}</FieldError>}
      </Field>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <header className="mb-6">
        <p className="mb-1 text-xs font-medium tracking-widest text-primary uppercase">
          Training log
        </p>
        <h1 className="text-2xl font-semibold">Edit run</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update this saved running workout.
        </p>
      </header>
      <form className="space-y-6" onSubmit={submit} noValidate>
        <FieldGroup>
          {input("workoutDate", "Date", { type: "date" })}
          {input("distanceKm", "Distance (km)", { inputMode: "decimal" })}
          <Field data-invalid={!!errors.durationSeconds}>
            <FieldLabel htmlFor="run-duration">Duration</FieldLabel>
            <Input
              id="run-duration"
              className="h-11 text-base md:text-sm"
              type="time"
              step="1"
              value={form.duration}
              aria-invalid={!!errors.durationSeconds}
              aria-describedby={
                errors.durationSeconds ? "run-duration-error" : undefined
              }
              onChange={(event) => change("duration", event.target.value)}
            />
            <FieldDescription>
              Use 24-hour HH:MM:SS. Seconds are supported and retained.
            </FieldDescription>
            <FieldError id="run-duration-error">
              {errors.durationSeconds}
            </FieldError>
          </Field>
          {input("calories", "Calories", { inputMode: "numeric" })}
          {input("manualSpeedKmH", "Manual speed (km/h) (optional)", {
            inputMode: "decimal",
          })}
        </FieldGroup>
        <section
          className="border bg-muted/30 p-4"
          aria-live="polite"
          aria-labelledby="edit-speed-preview"
        >
          <h2 id="edit-speed-preview" className="font-medium">
            Speed preview
          </h2>
          <p className="mt-2 text-sm">
            Calculated average speed:{" "}
            {preview.calculated ? `${preview.calculated.toFixed(2)} km/h` : "–"}
          </p>
          <p className="mt-1 text-sm">
            Effective speed:{" "}
            {preview.effective
              ? `${preview.effective.toFixed(2)} km/h${form.manualSpeedKmH.trim() ? " (manual)" : ""}`
              : "–"}
          </p>
        </section>
        {status && (
          <p role="alert" className="text-sm text-destructive">
            {status}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            className="h-11"
            type="submit"
            isDisabled={saving || deleting}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <LinkButton className="h-11" variant="outline" to="/record">
            Cancel
          </LinkButton>
        </div>
      </form>
      <div className="mt-8 border-t pt-6">
        <Button
          variant="destructive"
          className="h-11"
          onPress={() => setConfirming(true)}
        >
          Delete run
        </Button>
      </div>
      <AlertDialogContent
        isOpen={confirming}
        onOpenChange={setConfirming}
        isDismissable={!deleting}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete run?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the {run.workoutDate} run (
            {run.distanceMetres / 1000} km) and its contribution to your history
            and progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteError}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" isDisabled={deleting} onPress={remove}>
            {deleting ? "Deleting…" : "Delete run"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </main>
  )
}
