import { useEffect, useEffectEvent, useState } from "react"
import type { FormEvent } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, LinkButton } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getExercisePickerGroups } from "@/exercises/exercise-picker"
import type { ActiveCategory } from "@/exercises/exercise-picker"
import type { WorkoutDetail } from "@/workouts/workouts"
import {
  createWorkout,
  createWorkoutFromTemplate,
  deleteWorkout,
  updateWorkout,
} from "@/workouts/server-functions"

const repsError = "Enter a positive whole number of reps."
const key = () => crypto.randomUUID()
type SetRow = { key: string; reps: string }
type ExerciseRow = {
  key: string
  variantId: string
  variantName: string
  categoryName: string
  notes: string
  sets: SetRow[]
}
export type Editor = {
  templateId?: string
  date: string
  name: string
  notes: string
  rows: ExerciseRow[]
}

export function WorkoutEditor({
  editor,
  library,
  onDiscard,
  onSaved,
  workoutId,
}: {
  editor: Editor
  library: ActiveCategory[]
  onDiscard: () => void
  onSaved: (id: string) => void
  workoutId?: string
}) {
  const [form, setForm] = useState(editor)
  const [selected, setSelected] = useState("")
  const [setErrors, setSetErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const pickerGroups = getExercisePickerGroups(library)
  const variants = pickerGroups.flatMap((group) =>
    group.variants.map((variant) => ({
      ...variant,
      categoryName: group.name,
    }))
  )

  const onBeforeUnload = useEffectEvent((event: BeforeUnloadEvent) => {
    if (dirty) {
      event.preventDefault()
      event.returnValue = ""
    }
  })

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => onBeforeUnload(event)
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])
  const changed = (next: Editor) => {
    setDirty(true)
    setForm(next)
  }
  function addExercise() {
    const variant = variants.find((item) => item.id === selected)
    if (!variant) return
    changed({
      ...form,
      rows: [
        ...form.rows,
        {
          key: key(),
          variantId: variant.id,
          variantName: variant.name,
          categoryName: variant.categoryName,
          notes: "",
          sets: [{ key: key(), reps: "" }],
        },
      ],
    })
    setSelected("")
  }
  function move(index: number, direction: number) {
    const rows = [...form.rows]
    const target = index + direction
    ;[rows[index], rows[target]] = [rows[target], rows[index]]
    changed({ ...form, rows })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string> = {}
    const savableRows = form.rows.filter((row) => row.variantId)
    savableRows.forEach((row) =>
      row.sets.forEach((set) => {
        if (
          !/^\d+$/.test(set.reps.trim()) ||
          !Number.isSafeInteger(Number(set.reps)) ||
          Number(set.reps) < 1
        )
          errors[set.key] = repsError
      })
    )
    setSetErrors(errors)
    if (
      !form.rows.length ||
      (savableRows.length > 0 && savableRows.some((row) => !row.sets.length))
    ) {
      setSaveError("Add at least one set for every exercise.")
      return
    }
    if (Object.keys(errors).length) return
    setSaving(true)
    setSaveError("")
    try {
      const payload = {
        workoutDate: form.date,
        name: form.name,
        notes: form.notes,
        exercises: savableRows.map((row) => ({
          variantId: row.variantId,
          notes: row.notes,
          sets: row.sets.map((set) => set.reps),
        })),
      }
      const result = workoutId
        ? await updateWorkout({ data: { ...payload, id: workoutId } })
        : form.templateId
          ? await createWorkoutFromTemplate({
              data: { ...payload, templateId: form.templateId },
            })
          : await createWorkout({ data: payload })
      if (!result.ok) {
        const fieldErrors = result.fieldErrors?.exercises
        if (Array.isArray(fieldErrors)) {
          // fieldErrors indexes the submitted (savableRows) payload; map them
          // back onto those same rows so null-source exclusions can't shift
          // errors onto the wrong exercise.
          const serverErrors: Record<string, string> = {}
          savableRows.forEach((row, index) => {
            const item = fieldErrors[index]
            if (item && typeof item === "object" && "sets" in item) {
              const message =
                typeof item.sets === "string" ? item.sets : repsError
              row.sets.forEach((set) => {
                serverErrors[set.key] = message
              })
            }
          })
          setSetErrors(serverErrors)
        }
        setSaveError(
          result.message ?? "We couldn’t save your workout. Please try again."
        )
        return
      }
      setDirty(false)
      onSaved(result.value.id)
    } catch {
      setSaveError(
        "We couldn’t save your workout. Check your connection and try again."
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workoutId ? "Edit workout" : "Record a workout"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the sets you completed.
          </p>
        </div>
        <Button
          variant="ghost"
          onPress={() => {
            if (
              dirty &&
              !window.confirm("Discard your unsaved workout changes?")
            )
              return
            onDiscard()
          }}
          isDisabled={saving}
        >
          Discard
        </Button>
      </header>
      <form onSubmit={submit} noValidate className="space-y-5">
        {saveError && (
          <p
            role="alert"
            className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {saveError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="workout-date">Date</FieldLabel>
            <Input
              id="workout-date"
              type="date"
              className="h-11 text-base md:text-sm"
              value={form.date}
              onChange={(e) => changed({ ...form, date: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="workout-name">
              Workout name (optional)
            </FieldLabel>
            <Input
              id="workout-name"
              className="h-11 text-base md:text-sm"
              value={form.name}
              onChange={(e) => changed({ ...form, name: e.target.value })}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="workout-notes">
            General notes (optional)
          </FieldLabel>
          <Textarea
            id="workout-notes"
            value={form.notes}
            onChange={(e) => changed({ ...form, notes: e.target.value })}
          />
        </Field>
        <div className="space-y-3">
          {form.rows.map((row, index) => (
            <section key={row.key} className="border p-3">
              <div className="flex items-start gap-1">
                <div className="flex shrink-0 flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Move "${row.variantName}" up`}
                    isDisabled={saving || index === 0}
                    onPress={() => move(index, -1)}
                  >
                    <ChevronUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Move "${row.variantName}" down`}
                    isDisabled={saving || index === form.rows.length - 1}
                    onPress={() => move(index, 1)}
                  >
                    <ChevronDownIcon />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium break-words">{row.variantName}</h2>
                  <p className="text-xs text-muted-foreground">
                    {row.categoryName}
                  </p>
                  {!row.variantId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      The original exercise is no longer available. This row is
                      read-only and will be removed when saved.
                    </p>
                  )}
                  <Field className="mt-3">
                    <FieldLabel htmlFor={`notes-${row.key}`}>
                      Exercise notes (optional)
                    </FieldLabel>
                    <Textarea
                      id={`notes-${row.key}`}
                      disabled={!row.variantId}
                      value={row.notes}
                      onChange={(e) =>
                        changed({
                          ...form,
                          rows: form.rows.map((item) =>
                            item.key === row.key
                              ? { ...item, notes: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </Field>
                  <div className="mt-3 space-y-2">
                    {row.sets.map((set, setIndex) => (
                      <Field
                        key={set.key}
                        data-invalid={Boolean(setErrors[set.key])}
                      >
                        <FieldLabel htmlFor={`reps-${set.key}`}>
                          Set {setIndex + 1} reps
                        </FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            id={`reps-${set.key}`}
                            className="h-11 text-base md:text-sm"
                            type="text"
                            inputMode="numeric"
                            value={set.reps}
                            disabled={!row.variantId}
                            aria-invalid={Boolean(setErrors[set.key])}
                            onChange={(e) => {
                              changed({
                                ...form,
                                rows: form.rows.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        sets: item.sets.map((s) =>
                                          s.key === set.key
                                            ? { ...s, reps: e.target.value }
                                            : s
                                        ),
                                      }
                                    : item
                                ),
                              })
                              setSetErrors((current) => ({
                                ...current,
                                [set.key]: "",
                              }))
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            aria-label={`Remove set ${setIndex + 1} from ${row.variantName}`}
                            onPress={() =>
                              changed({
                                ...form,
                                rows: form.rows.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        sets: item.sets.filter(
                                          (s) => s.key !== set.key
                                        ),
                                      }
                                    : item
                                ),
                              })
                            }
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                        <FieldError>{setErrors[set.key]}</FieldError>
                      </Field>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-11"
                    isDisabled={!row.variantId}
                    onPress={() =>
                      changed({
                        ...form,
                        rows: form.rows.map((item) =>
                          item.key === row.key
                            ? {
                                ...item,
                                sets: [...item.sets, { key: key(), reps: "" }],
                              }
                            : item
                        ),
                      })
                    }
                  >
                    <PlusIcon /> Add set
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove ${row.variantName}`}
                  onPress={() =>
                    changed({
                      ...form,
                      rows: form.rows.filter((item) => item.key !== row.key),
                    })
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            </section>
          ))}
        </div>
        <div className="flex gap-2">
          <Select
            aria-label="Exercise"
            className="min-w-0 flex-1"
            selectedKey={selected || null}
            onSelectionChange={(selectedKey) =>
              setSelected(String(selectedKey))
            }
            isDisabled={saving}
            placeholder="Select an exercise"
          >
            <SelectTrigger className="h-11!">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pickerGroups.map((group) => (
                <SelectGroup key={group.name}>
                  <SelectLabel>{group.name}</SelectLabel>
                  {group.variants.map((variant) => (
                    <SelectItem key={variant.id} id={variant.id}>
                      {variant.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="h-11"
            isDisabled={!selected || saving}
            onPress={addExercise}
          >
            <PlusIcon /> Add exercise
          </Button>
        </div>
        <Button type="submit" className="h-11" isDisabled={saving}>
          {saving ? "Saving…" : "Save workout"}
        </Button>
      </form>
    </main>
  )
}

export function Success({
  id,
  onAnother,
}: {
  id: string
  onAnother: () => void
}) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <div className="border p-6">
        <h1 className="text-2xl font-semibold">Workout saved</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your workout has been saved.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="h-11" onPress={onAnother}>
            Record another workout
          </Button>
          <LinkButton
            className="h-11"
            variant="outline"
            to="/record/$workoutId"
            // LinkButton's React Aria wrapper erases typed-route params;
            // cast the shape we know the route expects.
            params={{ workoutId: id } as never}
          >
            View saved workout
          </LinkButton>
        </div>
      </div>
    </main>
  )
}

export function editorFromWorkout(workout: WorkoutDetail): Editor {
  return {
    date: workout.workoutDate,
    name: workout.name ?? "",
    notes: workout.notes ?? "",
    rows: workout.exercises.map((exercise) => ({
      key: key(),
      variantId: exercise.sourceVariantId ?? "",
      variantName: exercise.variantName,
      categoryName: exercise.categoryName,
      notes: exercise.notes ?? "",
      sets: exercise.sets.map((set) => ({
        key: key(),
        reps: String(set.reps),
      })),
    })),
  }
}

export function WorkoutDeleteDialog({
  workoutId,
  onDeleted,
}: {
  workoutId: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  async function remove() {
    setDeleting(true)
    setDeleteError("")
    try {
      const result = await deleteWorkout({ data: { id: workoutId } })
      if (result.ok) {
        onDeleted()
        return
      }
      setDeleteError("We couldn’t delete this workout. Please try again.")
    } catch {
      setDeleteError(
        "We couldn’t delete this workout. Check your connection and try again."
      )
    } finally {
      setDeleting(false)
    }
  }
  return (
    <>
      <Button
        variant="destructive"
        className="h-11"
        onPress={() => setOpen(true)}
      >
        Delete workout
      </Button>
      <AlertDialogContent
        isOpen={open}
        onOpenChange={setOpen}
        isDismissable={!deleting}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete workout?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes this workout and its sets.
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
            {deleting ? "Deleting…" : "Delete workout"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </>
  )
}
