import { useState } from "react"
import { ArchiveIcon, DumbbellIcon, PencilIcon, PlusIcon } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  addExerciseCategory,
  addExerciseVariant,
  removeExerciseCategory,
  removeExerciseVariant,
  updateExerciseCategory,
  updateExerciseVariant,
} from "./server-functions"

export type ManagedVariant = {
  id: string
  categoryId: string
  name: string
  difficultyMultiplier: number
  archivedAt: Date | string | null
}

export type ManagedCategory = {
  id: string
  name: string
  archivedAt: Date | string | null
  variants: ManagedVariant[]
}

type Editor =
  | { kind: "category"; category?: ManagedCategory }
  | { kind: "variant"; category: ManagedCategory; variant?: ManagedVariant }
  | null

type ArchiveTarget =
  | { kind: "category"; category: ManagedCategory }
  | { kind: "variant"; category: ManagedCategory; variant: ManagedVariant }
  | null

const multiplierError =
  "Enter a positive multiplier with no more than three decimal places."

export function ExerciseLibraryManager({
  initialCategories,
}: {
  initialCategories: ManagedCategory[]
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [editor, setEditor] = useState<Editor>(null)
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget>(null)
  const [announcement, setAnnouncement] = useState("")

  function replaceCategory(category: ManagedCategory) {
    setCategories((current) =>
      current.map((item) => (item.id === category.id ? category : item))
    )
  }

  async function archive() {
    if (!archiveTarget) return
    const target = archiveTarget
    const result =
      target.kind === "category"
        ? await removeExerciseCategory({ data: { id: target.category.id } })
        : await removeExerciseVariant({ data: { id: target.variant.id } })
    if (!result.ok) {
      setAnnouncement("The item could not be archived. Please try again.")
      return
    }
    if (target.kind === "category") {
      replaceCategory({
        ...target.category,
        archivedAt: new Date().toISOString(),
      })
      setAnnouncement(`${target.category.name} archived.`)
    } else {
      replaceCategory({
        ...target.category,
        variants: target.category.variants.map((variant) =>
          variant.id === target.variant.id
            ? { ...variant, archivedAt: new Date().toISOString() }
            : variant
        ),
      })
      setAnnouncement(`${target.variant.name} archived.`)
    }
    setArchiveTarget(null)
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium tracking-widest text-primary uppercase">
            Training setup
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Exercise library
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Organise movements into categories and set each progression’s
            difficulty.
          </p>
        </div>
        <Button
          className="h-11 px-3"
          onPress={() => setEditor({ kind: "category" })}
        >
          <PlusIcon aria-hidden="true" />
          <span className="hidden min-[390px]:inline">Category</span>
          <span className="sr-only min-[390px]:hidden">Add category</span>
        </Button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {categories.length === 0 ? (
        <div className="border border-dashed p-8 text-center">
          <DumbbellIcon
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-medium">No exercise categories yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a category, then create progression variants inside it.
          </p>
          <Button
            className="mt-5 h-11"
            onPress={() => setEditor({ kind: "category" })}
          >
            <PlusIcon aria-hidden="true" /> Add your first category
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const archived = Boolean(category.archivedAt)
            return (
              <section
                key={category.id}
                className="border bg-background"
                aria-labelledby={`category-${category.id}`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3 border-b p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id={`category-${category.id}`}
                        className="text-base font-semibold break-words"
                      >
                        {category.name}
                      </h2>
                      {archived && <Badge variant="outline">Archived</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.variants.length}{" "}
                      {category.variants.length === 1 ? "variant" : "variants"}
                    </p>
                  </div>
                  {!archived && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Edit ${category.name}`}
                        onPress={() =>
                          setEditor({ kind: "category", category })
                        }
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Archive ${category.name}`}
                        onPress={() =>
                          setArchiveTarget({ kind: "category", category })
                        }
                      >
                        <ArchiveIcon aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="divide-y">
                  {category.variants.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">
                      No progression variants yet.
                    </p>
                  )}
                  {category.variants.map((variant) => {
                    const variantArchived =
                      Boolean(variant.archivedAt) || archived
                    return (
                      <div
                        key={variant.id}
                        className="flex min-w-0 items-center justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium break-words">
                              {variant.name}
                            </h3>
                            {variantArchived && (
                              <Badge variant="outline">Archived</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Multiplier{" "}
                            <span className="font-medium text-foreground">
                              {formatMultiplier(variant.difficultyMultiplier)}×
                            </span>
                          </p>
                        </div>
                        {!variantArchived && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label={`Edit ${variant.name}`}
                              onPress={() =>
                                setEditor({
                                  kind: "variant",
                                  category,
                                  variant,
                                })
                              }
                            >
                              <PencilIcon aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label={`Archive ${variant.name}`}
                              onPress={() =>
                                setArchiveTarget({
                                  kind: "variant",
                                  category,
                                  variant,
                                })
                              }
                            >
                              <ArchiveIcon aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!archived && (
                  <div className="border-t p-3">
                    <Button
                      variant="ghost"
                      className="h-11 w-full"
                      onPress={() => setEditor({ kind: "variant", category })}
                    >
                      <PlusIcon aria-hidden="true" /> Add progression variant
                    </Button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {editor && (
        <EditorDialog
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={(category, message) => {
            if (editor.kind === "category" && !editor.category) {
              setCategories((current) => [...current, category])
            } else {
              replaceCategory(category)
            }
            setAnnouncement(message)
            setEditor(null)
          }}
        />
      )}

      {archiveTarget && (
        <AlertDialogContent
          isOpen
          onOpenChange={(open) => !open && setArchiveTarget(null)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiveTarget.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget.kind === "category"
                ? archiveTarget.category.name
                : archiveTarget.variant.name}{" "}
              will remain in existing templates and workout history, but cannot
              be newly selected. This action cannot be undone here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onPress={archive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </div>
  )
}

function EditorDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: Exclude<Editor, null>
  onClose: () => void
  onSaved: (category: ManagedCategory, message: string) => void
}) {
  const existing = editor.kind === "category" ? editor.category : editor.variant
  const [name, setName] = useState(existing?.name ?? "")
  const [multiplier, setMultiplier] = useState(
    editor.kind === "variant" && editor.variant
      ? formatMultiplier(editor.variant.difficultyMultiplier)
      : "1"
  )
  const [errors, setErrors] = useState<{
    name?: string
    difficultyMultiplier?: string
  }>({})
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = "Enter a name."
    if (
      editor.kind === "variant" &&
      !/^\d+(?:\.\d{1,3})?$/.test(multiplier.trim())
    )
      nextErrors.difficultyMultiplier = multiplierError
    if (editor.kind === "variant" && Number(multiplier) <= 0)
      nextErrors.difficultyMultiplier = multiplierError
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    setSaveError("")
    try {
      if (editor.kind === "category") {
        const result = editor.category
          ? await updateExerciseCategory({
              data: { id: editor.category.id, name },
            })
          : await addExerciseCategory({ data: { name } })
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {})
          return
        }
        const category: ManagedCategory = editor.category
          ? { ...editor.category, name: result.value.name }
          : { ...result.value, variants: [] }
        onSaved(
          category,
          `${category.name} ${editor.category ? "updated" : "created"}.`
        )
      } else {
        const result = editor.variant
          ? await updateExerciseVariant({
              data: {
                id: editor.variant.id,
                name,
                difficultyMultiplier: multiplier,
              },
            })
          : await addExerciseVariant({
              data: {
                categoryId: editor.category.id,
                name,
                difficultyMultiplier: multiplier,
              },
            })
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {})
          return
        }
        const variants = editor.variant
          ? editor.category.variants.map((item) =>
              item.id === editor.variant?.id ? result.value : item
            )
          : [...editor.category.variants, result.value]
        onSaved(
          { ...editor.category, variants },
          `${result.value.name} ${editor.variant ? "updated" : "created"}.`
        )
      }
    } catch {
      setSaveError(
        "We couldn’t save your changes. Check your connection and try again."
      )
    } finally {
      setSaving(false)
    }
  }

  const label = editor.kind === "category" ? "category" : "progression variant"
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md"
    >
      <form onSubmit={submit} noValidate>
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit" : "Add"} {label}
          </DialogTitle>
          <DialogDescription>
            {editor.kind === "variant"
              ? `Set a progression name and difficulty relative to ${editor.category.name}.`
              : "Use a clear movement family name, such as Pull-up or Squat."}
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
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="exercise-name">Name</FieldLabel>
            <Input
              id="exercise-name"
              className="h-11 text-base md:text-sm"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              autoFocus
            />
            <FieldError id="name-error">{errors.name}</FieldError>
          </Field>
          {editor.kind === "variant" && (
            <Field data-invalid={Boolean(errors.difficultyMultiplier)}>
              <FieldLabel htmlFor="difficulty-multiplier">
                Difficulty multiplier
              </FieldLabel>
              <Input
                id="difficulty-multiplier"
                className="h-11 text-base md:text-sm"
                type="text"
                inputMode="decimal"
                value={multiplier}
                onChange={(event) => {
                  setMultiplier(event.target.value)
                  setErrors((current) => ({
                    ...current,
                    difficultyMultiplier: undefined,
                  }))
                }}
                aria-invalid={Boolean(errors.difficultyMultiplier)}
                aria-describedby="multiplier-help multiplier-error"
              />
              <FieldDescription id="multiplier-help">
                Use a positive decimal, such as 0.75, 1, or 1.25.
              </FieldDescription>
              <FieldError id="multiplier-error">
                {errors.difficultyMultiplier}
              </FieldError>
            </Field>
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

function formatMultiplier(value: number) {
  return (value / 1000).toFixed(3).replace(/\.?0+$/, "")
}
