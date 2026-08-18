import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DumbbellIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Button, LinkButton } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { ActiveCategory } from "@/templates/template-manager"
import type {
  WorkoutTemplateDetail,
  WorkoutTemplateSummary,
} from "@/templates/templates"
import { readWorkoutTemplate } from "@/templates/server-functions"
import {
  createWorkout,
  createWorkoutFromTemplate,
} from "@/workouts/server-functions"

const repsError = "Enter a positive whole number of reps."
const key = () => crypto.randomUUID()
const today = () => new Date().toISOString().slice(0, 10)

type SetRow = { key: string; reps: string }
type ExerciseRow = {
  key: string
  variantId: string
  variantName: string
  categoryName: string
  notes: string
  sets: SetRow[]
}
type Editor = {
  templateId?: string
  date: string
  name: string
  notes: string
  rows: ExerciseRow[]
}

function rowFromTemplate(
  exercise: WorkoutTemplateDetail["exercises"][number]
): ExerciseRow {
  return {
    key: key(),
    variantId: exercise.variantId,
    variantName: exercise.variantName,
    categoryName: exercise.categoryName,
    notes: "",
    sets: Array.from({ length: exercise.setCount }, () => ({
      key: key(),
      reps: "",
    })),
  }
}

export function RecordManager({
  initialTemplates,
  initialLibrary,
}: {
  initialTemplates: WorkoutTemplateSummary[]
  initialLibrary: ActiveCategory[]
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [savedId, setSavedId] = useState<string | null>(null)
  const hasLibrary = initialLibrary.some(
    (category) =>
      category.archivedAt === null &&
      category.variants.some((variant) => variant.archivedAt === null)
  )

  function discard() {
    if (!editor || window.confirm("Discard your unsaved workout changes?")) {
      setEditor(null)
      return true
    }
    return false
  }
  function blank() {
    if (editor && !discard()) return
    setEditor({ date: today(), name: "", notes: "", rows: [] })
  }
  async function startTemplate(template: WorkoutTemplateSummary) {
    if (editor && !discard()) return
    setLoadingTemplate(template.id)
    try {
      const detail = await readWorkoutTemplate({ data: { id: template.id } })
      if (!detail || !detail.canStart) {
        setAnnouncement("This template is no longer eligible to start.")
        return
      }
      setEditor({
        templateId: detail.id,
        date: today(),
        name: detail.name,
        notes: "",
        rows: detail.exercises.map(rowFromTemplate),
      })
    } catch {
      setAnnouncement("We couldn’t load that template. Please try again.")
    } finally {
      setLoadingTemplate(null)
    }
  }

  if (savedId) {
    return (
      <Success
        id={savedId}
        onAnother={() => {
          setSavedId(null)
          blank()
        }}
      />
    )
  }
  if (editor) {
    return (
      <WorkoutEditor
        editor={editor}
        library={initialLibrary}
        onDiscard={discard}
        onSaved={(id) => {
          setEditor(null)
          setSavedId(id)
        }}
      />
    )
  }
  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <header className="mb-6">
        <p className="mb-1 text-xs font-medium tracking-widest text-primary uppercase">
          Training log
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Record a workout
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log a completed workout in just a few taps.
        </p>
      </header>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {!hasLibrary ? (
        <div className="border border-dashed p-8 text-center">
          <DumbbellIcon
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-medium">Build your exercise library first</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an active exercise before recording a workout.
          </p>
          <LinkButton className="mt-5 h-11" to="/exercises">
            Go to exercise library
          </LinkButton>
        </div>
      ) : (
        <>
          <Button className="h-11" onPress={blank}>
            <PlusIcon /> Start blank
          </Button>
          <section className="mt-6" aria-labelledby="templates-heading">
            <h2 id="templates-heading" className="font-medium">
              Start from a template
            </h2>
            <div className="mt-3 space-y-3">
              {initialTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates yet. Start a blank workout or create one from
                  Templates.
                </p>
              ) : (
                initialTemplates.map((template) => (
                  <div key={template.id} className="border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{template.name}</h3>
                          {!template.canStart && (
                            <Badge variant="outline">Ineligible</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {template.exerciseCount}{" "}
                          {template.exerciseCount === 1
                            ? "exercise"
                            : "exercises"}
                        </p>
                      </div>
                      <Button
                        className="h-11"
                        isDisabled={
                          !template.canStart || loadingTemplate === template.id
                        }
                        onPress={() => startTemplate(template)}
                      >
                        {loadingTemplate === template.id
                          ? "Loading…"
                          : "Use template"}
                      </Button>
                    </div>
                    {!template.canStart && (
                      <p className="mt-3 text-sm text-destructive">
                        Contains archived exercises or no exercises — update it
                        in Templates before using it.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function WorkoutEditor({
  editor,
  library,
  onDiscard,
  onSaved,
}: {
  editor: Editor
  library: ActiveCategory[]
  onDiscard: () => boolean
  onSaved: (id: string) => void
}) {
  const [form, setForm] = useState(editor)
  const [selected, setSelected] = useState("")
  const [setErrors, setSetErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const variants = library.flatMap((category) =>
    category.archivedAt === null
      ? category.variants
          .filter((variant) => variant.archivedAt === null)
          .map((variant) => ({ ...variant, categoryName: category.name }))
      : []
  )

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
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
    form.rows.forEach((row) =>
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
    if (!form.rows.length || form.rows.some((row) => !row.sets.length)) {
      setSaveError("Add at least one set for every exercise.")
      return
    }
    if (Object.keys(errors).length) return
    setSaving(true)
    setSaveError("")
    try {
      const data = {
        workoutDate: form.date,
        name: form.name,
        notes: form.notes,
        exercises: form.rows.map((row) => ({
          variantId: row.variantId,
          notes: row.notes,
          sets: row.sets.map((set) => set.reps),
        })),
      }
      const result = form.templateId
        ? await createWorkoutFromTemplate({
            data: { ...data, templateId: form.templateId },
          })
        : await createWorkout({ data })
      if (!result.ok) {
        const fieldErrors = result.fieldErrors?.exercises
        if (Array.isArray(fieldErrors)) {
          const serverErrors: Record<string, string> = {}
          fieldErrors.forEach((item, index) => {
            if (
              item &&
              typeof item === "object" &&
              "sets" in item &&
              form.rows[index]
            )
              form.rows[index].sets.forEach((set) => {
                serverErrors[set.key] =
                  typeof item.sets === "string" ? item.sets : repsError
              })
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
            Record a workout
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the sets you completed.
          </p>
        </div>
        <Button
          variant="ghost"
          onPress={() => !dirty || onDiscard()}
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
                  <Field className="mt-3">
                    <FieldLabel htmlFor={`notes-${row.key}`}>
                      Exercise notes (optional)
                    </FieldLabel>
                    <Textarea
                      id={`notes-${row.key}`}
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
          <label className="sr-only" htmlFor="exercise-picker">
            Exercise
          </label>
          <NativeSelect
            id="exercise-picker"
            className="h-11 flex-1"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <NativeSelectOption value="">Select an exercise</NativeSelectOption>
            {library
              .filter((category) => category.archivedAt === null)
              .map((category) => (
                <NativeSelectOptGroup key={category.id} label={category.name}>
                  {category.variants
                    .filter((variant) => variant.archivedAt === null)
                    .map((variant) => (
                      <NativeSelectOption key={variant.id} value={variant.id}>
                        {variant.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelectOptGroup>
              ))}
          </NativeSelect>
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

function Success({ id, onAnother }: { id: string; onAnother: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <div className="border p-6">
        <h1 className="text-2xl font-semibold">Workout saved</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your workout ID is <code>{id}</code>.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          It will appear in History once workout viewing arrives.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="h-11" onPress={onAnother}>
            Record another workout
          </Button>
          <LinkButton className="h-11" variant="outline" to="/history">
            Go to History
          </LinkButton>
        </div>
      </div>
    </main>
  )
}
