import { useState } from "react"
import type { FormEvent } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DumbbellIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
import type { WorkoutTemplateDetail, WorkoutTemplateSummary } from "./templates"
import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  readWorkoutTemplate,
  updateWorkoutTemplate,
} from "./server-functions"

export type ActiveVariant = {
  id: string
  name: string
  categoryId: string
  difficultyMultiplier: number
  archivedAt: Date | string | null
}
export type ActiveCategory = {
  id: string
  name: string
  archivedAt: Date | string | null
  variants: ActiveVariant[]
}

type EditorRow = {
  key: string
  variantId: string
  setCount: string
  variantName: string
  categoryName: string
  archived: boolean
}
type Editor = { id?: string; name: string; rows: EditorRow[] }

const setCountError = "Enter a positive whole number of sets."
const rowKey = () => crypto.randomUUID()

function summaryFromDetail(
  detail: WorkoutTemplateDetail
): WorkoutTemplateSummary {
  return {
    id: detail.id,
    name: detail.name,
    updatedAt: detail.updatedAt,
    exerciseCount: detail.exercises.length,
    canStart: detail.canStart,
  }
}

export function TemplateManager({
  initialTemplates,
  initialLibrary,
}: {
  initialTemplates: WorkoutTemplateSummary[]
  initialLibrary: ActiveCategory[]
}) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<WorkoutTemplateSummary | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const hasLibrary = initialLibrary.some(
    (category) =>
      category.archivedAt === null &&
      category.variants.some((variant) => variant.archivedAt === null)
  )

  async function openEditor(template: WorkoutTemplateSummary) {
    setLoadingId(template.id)
    try {
      const detail = await readWorkoutTemplate({ data: { id: template.id } })
      if (!detail) {
        setAnnouncement("That template could not be found.")
        return
      }
      setEditor({
        id: detail.id,
        name: detail.name,
        rows: detail.exercises.map((exercise) => ({
          key: rowKey(),
          variantId: exercise.variantId,
          setCount: String(exercise.setCount),
          variantName: exercise.variantName,
          categoryName: exercise.categoryName,
          archived: exercise.archived,
        })),
      })
    } catch {
      setAnnouncement("We couldn’t load that template. Please try again.")
    } finally {
      setLoadingId(null)
    }
  }

  async function removeTemplate() {
    if (!deleteTarget) return
    setDeleteError("")
    try {
      const result = await deleteWorkoutTemplate({
        data: { id: deleteTarget.id },
      })
      if (!result.ok) {
        setDeleteError("We couldn’t delete this template. Please try again.")
        return
      }
      setTemplates((current) =>
        current.filter((template) => template.id !== deleteTarget.id)
      )
      setAnnouncement(`${deleteTarget.name} deleted.`)
      setDeleteTarget(null)
    } catch {
      setDeleteError("We couldn’t delete this template. Please try again.")
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium tracking-widest text-primary uppercase">
            Training setup
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Build reusable workout structures for consistent training.
          </p>
        </div>
        {hasLibrary && (
          <Button
            className="h-11 px-3"
            onPress={() => setEditor({ name: "", rows: [] })}
          >
            <PlusIcon aria-hidden="true" />
            <span className="hidden min-[390px]:inline">New template</span>
            <span className="sr-only min-[390px]:hidden">New template</span>
          </Button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {!hasLibrary && (
        <div className="mb-4 border border-dashed p-8 text-center">
          <DumbbellIcon
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-medium">Build your exercise library first</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Templates need at least one active exercise to build from.
          </p>
          <LinkButton className="mt-5 h-11" to="/exercises">
            Go to exercise library
          </LinkButton>
        </div>
      )}

      {templates.length === 0 && hasLibrary ? (
        <div className="border border-dashed p-8 text-center">
          <h2 className="font-medium">No templates yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a reusable workout structure to get started.
          </p>
          <Button
            className="mt-5 h-11"
            onPress={() => setEditor({ name: "", rows: [] })}
          >
            <PlusIcon aria-hidden="true" /> Create your first template
          </Button>
        </div>
      ) : templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((template) => (
            <section key={template.id} className="border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold break-words">
                      {template.name}
                    </h2>
                    {!template.canStart && (
                      <Badge variant="outline">Ineligible</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.exerciseCount}{" "}
                    {template.exerciseCount === 1 ? "exercise" : "exercises"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Edit ${template.name}`}
                    isDisabled={loadingId === template.id}
                    onPress={() => openEditor(template)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Delete ${template.name}`}
                    onPress={() => {
                      setDeleteError("")
                      setDeleteTarget(template)
                    }}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
              </div>
              {!template.canStart && (
                <p className="mt-3 text-sm text-destructive">
                  {template.exerciseCount === 0
                    ? "Add an exercise before using this template."
                    : "Contains archived exercises — replace or remove them to use this template."}
                </p>
              )}
            </section>
          ))}
        </div>
      ) : null}

      {editor && (
        <TemplateEditor
          editor={editor}
          library={initialLibrary}
          onClose={() => setEditor(null)}
          onSaved={(detail) => {
            const summary = summaryFromDetail(detail)
            setTemplates((current) =>
              editor.id
                ? current.map((item) =>
                    item.id === summary.id ? summary : item
                  )
                : [...current, summary].sort((a, b) =>
                    a.name.localeCompare(b.name)
                  )
            )
            setAnnouncement(`${summary.name} saved.`)
            setEditor(null)
          }}
        />
      )}
      {deleteTarget && (
        <AlertDialogContent
          isOpen
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the template and does not affect logged
              workouts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p
              role="alert"
              className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onPress={removeTemplate}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </div>
  )
}

function TemplateEditor({
  editor,
  library,
  onClose,
  onSaved,
}: {
  editor: Editor
  library: ActiveCategory[]
  onClose: () => void
  onSaved: (detail: WorkoutTemplateDetail) => void
}) {
  const [name, setName] = useState(editor.name)
  const [rows, setRows] = useState(editor.rows)
  const [selected, setSelected] = useState("")
  const [nameError, setNameError] = useState("")
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const variants = library.flatMap((category) =>
    category.archivedAt === null
      ? category.variants
          .filter((variant) => variant.archivedAt === null)
          .map((variant) => ({
            ...variant,
            categoryName: category.name,
          }))
      : []
  )
  const archived = rows.some((row) => row.archived)

  function addExercise() {
    const variant = variants.find((item) => item.id === selected)
    if (!variant) return
    setRows((current) => [
      ...current,
      {
        key: rowKey(),
        variantId: variant.id,
        setCount: "3",
        variantName: variant.name,
        categoryName: variant.categoryName,
        archived: false,
      },
    ])
    setSelected("")
  }
  function move(index: number, direction: number) {
    setRows((current) => {
      const next = [...current]
      const target = index + direction
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) setNameError("Enter a name.")
    rows.forEach((row) => {
      if (
        !/^\d+$/.test(row.setCount) ||
        !Number.isSafeInteger(Number(row.setCount)) ||
        Number(row.setCount) < 1
      )
        nextErrors[row.key] = setCountError
    })
    setRowErrors(nextErrors)
    if (!name.trim() || Object.keys(nextErrors).length) return
    setSaving(true)
    setSaveError("")
    try {
      const data = {
        name,
        exercises: rows.map((row) => ({
          variantId: row.variantId,
          setCount: Number(row.setCount),
        })),
      }
      const result = editor.id
        ? await updateWorkoutTemplate({ data: { id: editor.id, ...data } })
        : await createWorkoutTemplate({ data })
      if (!result.ok) {
        setNameError(result.fieldErrors?.name ?? "")
        const errors: Record<string, string> = {}
        result.fieldErrors?.exercises?.forEach((error, index) => {
          if (error && rows[index]) errors[rows[index].key] = error
        })
        setRowErrors(errors)
        if (!result.fieldErrors)
          setSaveError("We couldn’t save your changes. Please try again.")
        return
      }
      onSaved(result.value)
    } catch {
      setSaveError(
        "We couldn’t save your changes. Check your connection and try again."
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md"
    >
      <form onSubmit={submit} noValidate>
        <DialogHeader>
          <DialogTitle>
            {editor.id ? "Edit template" : "New template"}
          </DialogTitle>
          <DialogDescription>
            Name your workout and arrange its exercises.
          </DialogDescription>
        </DialogHeader>
        <div className="my-5 space-y-4">
          {saveError && (
            <p
              role="alert"
              className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}
          {archived && (
            <p
              role="alert"
              className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              This template can't be started until the archived exercise(s) are
              removed or replaced.
            </p>
          )}
          <Field data-invalid={Boolean(nameError)}>
            <FieldLabel htmlFor="template-name">Name</FieldLabel>
            <Input
              id="template-name"
              className="h-11 text-base md:text-sm"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError("")
              }}
              autoFocus
              aria-invalid={Boolean(nameError)}
            />{" "}
            <FieldError>{nameError}</FieldError>
          </Field>
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.key} className="border p-3">
                <div className="flex items-start gap-1">
                  <div className="flex shrink-0 flex-col">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Move "${row.variantName}" up`}
                      isDisabled={saving || index === 0}
                      onPress={() => move(index, -1)}
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Move "${row.variantName}" down`}
                      isDisabled={saving || index === rows.length - 1}
                      onPress={() => move(index, 1)}
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.variantName}</p>
                      {row.archived && (
                        <Badge variant="outline">Archived</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.categoryName}
                    </p>
                    {row.archived && (
                      <p className="mt-1 text-xs text-destructive">
                        Archived — replace or remove before starting.
                      </p>
                    )}
                    <Field
                      className="mt-2"
                      data-invalid={Boolean(rowErrors[row.key])}
                    >
                      <FieldLabel htmlFor={`sets-${row.key}`}>Sets</FieldLabel>
                      <Input
                        id={`sets-${row.key}`}
                        className="h-11 text-base md:text-sm"
                        type="text"
                        inputMode="numeric"
                        value={row.setCount}
                        onChange={(event) => {
                          const setCount = event.target.value
                          setRows((current) =>
                            current.map((item) =>
                              item.key === row.key
                                ? { ...item, setCount }
                                : item
                            )
                          )
                          setRowErrors((current) => ({
                            ...current,
                            [row.key]: "",
                          }))
                        }}
                        aria-invalid={Boolean(rowErrors[row.key])}
                        disabled={saving}
                      />
                      <FieldError>{rowErrors[row.key]}</FieldError>
                    </Field>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Remove ${row.variantName}`}
                    isDisabled={saving}
                    onPress={() =>
                      setRows((current) =>
                        current.filter((item) => item.key !== row.key)
                      )
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {variants.length ? (
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="exercise-picker">
                Exercise
              </label>
              <NativeSelect
                id="exercise-picker"
                className="h-11 flex-1"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                disabled={saving}
              >
                <NativeSelectOption value="">
                  Select an exercise
                </NativeSelectOption>
                {library
                  .filter((category) => category.archivedAt === null)
                  .map((category) => (
                    <NativeSelectOptGroup
                      key={category.id}
                      label={category.name}
                    >
                      {category.variants
                        .filter((variant) => variant.archivedAt === null)
                        .map((variant) => (
                          <NativeSelectOption
                            key={variant.id}
                            value={variant.id}
                          >
                            {variant.name}
                          </NativeSelectOption>
                        ))}
                    </NativeSelectOptGroup>
                  ))}
              </NativeSelect>
              <Button
                type="button"
                className="h-11"
                isDisabled={saving || !selected}
                onPress={addExercise}
              >
                <PlusIcon /> Add exercise
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add exercises in the Exercise library first.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose className="h-11" isDisabled={saving}>
            Cancel
          </DialogClose>
          <Button type="submit" className="h-11" isDisabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
