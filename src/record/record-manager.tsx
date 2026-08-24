import { useEffect, useState } from "react"
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DumbbellIcon, FootprintsIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { localCalendarToday } from "@/lib/date"
import type { ActiveCategory } from "@/exercises/exercise-picker"
import type {
  WorkoutTemplateDetail,
  WorkoutTemplateSummary,
} from "@/templates/templates"
import type { RunningWorkout } from "@/running/running-workouts"
import { readWorkoutTemplate } from "@/templates/server-functions"
import { listWorkouts, prepareRepeatWorkout } from "@/workouts/server-functions"
import { editorFromRepeat, Success, WorkoutEditor } from "./workout-editor"
import type { Editor } from "./workout-editor"
import {
  clearWorkoutDraft,
  makeWorkoutDraft,
  readWorkoutDraft,
  writeWorkoutDraft,
} from "./workout-draft-storage"
import type { WorkoutDraft, WorkoutDraftOrigin } from "./workout-draft-storage"

const key = () => crypto.randomUUID()

type SavedWorkout = {
  id: string
  workoutDate: string
  name: string | null
  exercises: unknown[]
}
type TemplateExercise = WorkoutTemplateDetail["exercises"][number]

function rowFromTemplate(exercise: TemplateExercise) {
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
  initialWorkouts = [],
  initialRuns = [],
}: {
  initialTemplates: WorkoutTemplateSummary[]
  initialLibrary: ActiveCategory[]
  initialWorkouts?: SavedWorkout[]
  initialRuns?: RunningWorkout[]
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [savedId, setSavedId] = useState<string | null>(null)
  const [date, setDate] = useState("")
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [repeating, setRepeating] = useState<string | null>(null)
  const [repeatError, setRepeatError] = useState("")
  const [recoveredDraft, setRecoveredDraft] = useState<WorkoutDraft | null>(
    null
  )
  const [activeDraft, setActiveDraft] = useState<WorkoutDraft | null>(null)
  const [pendingStart, setPendingStart] = useState<{
    editor: Editor
    origin: WorkoutDraftOrigin
  } | null>(null)
  const [discardingDraft, setDiscardingDraft] = useState(false)
  const storage = () => window.localStorage
  const persist = (draft: WorkoutDraft) => {
    try {
      if (!writeWorkoutDraft(storage(), draft))
        throw new Error("storage unavailable")
    } catch {
      setAnnouncement(
        "Draft recovery is unavailable in this browser. Your workout remains open, but it may not survive a refresh."
      )
    }
  }
  const clearPersisted = () => {
    try {
      if (!clearWorkoutDraft(storage())) throw new Error("storage unavailable")
    } catch {
      setAnnouncement("Draft recovery is unavailable in this browser.")
    }
  }
  useEffect(() => {
    try {
      const result = readWorkoutDraft(storage())
      if (result.kind === "draft") setRecoveredDraft(result.draft)
      else if (result.kind === "invalid")
        setAnnouncement("An unreadable saved workout draft was removed.")
      else if (result.kind === "unavailable")
        setAnnouncement("Draft recovery is unavailable in this browser.")
    } catch {
      setAnnouncement("Draft recovery is unavailable in this browser.")
    }
  }, [])
  const hasLibrary = initialLibrary.some(
    (category) =>
      category.archivedAt === null &&
      category.variants.some((variant) => variant.archivedAt === null)
  )
  const reconcile = (value: Editor): Editor => {
    const active = new Set(
      initialLibrary.flatMap((category) =>
        category.archivedAt === null
          ? category.variants
              .filter((variant) => variant.archivedAt === null)
              .map((variant) => variant.id)
          : []
      )
    )
    return {
      ...value,
      rows: value.rows.map((row) => ({
        ...row,
        unavailable: Boolean(row.variantId && !active.has(row.variantId)),
      })),
    }
  }
  const begin = (next: Editor, origin: WorkoutDraftOrigin) => {
    const draft = makeWorkoutDraft(key(), origin, reconcile(next))
    persist(draft)
    setRecoveredDraft(null)
    setActiveDraft(draft)
    setEditor(draft.editor)
    setPendingStart(null)
  }
  const requestStart = (next: Editor, origin: WorkoutDraftOrigin) => {
    if (recoveredDraft) setPendingStart({ editor: next, origin })
    else begin(next, origin)
  }
  const blank = () =>
    requestStart(
      { date: localCalendarToday(), name: "", notes: "", rows: [] },
      "blank"
    )
  async function startTemplate(template: WorkoutTemplateSummary) {
    setLoadingTemplate(template.id)
    try {
      const detail = await readWorkoutTemplate({ data: { id: template.id } })
      if (!detail || !detail.canStart) {
        setAnnouncement("This template is no longer eligible to start.")
        return
      }
      requestStart(
        {
          templateId: detail.id,
          date: localCalendarToday(),
          name: detail.name,
          notes: "",
          rows: detail.exercises.map(rowFromTemplate),
        },
        "template"
      )
    } catch {
      setAnnouncement("We couldn’t load that template. Please try again.")
    } finally {
      setLoadingTemplate(null)
    }
  }
  async function repeat(workoutId: string) {
    setRepeating(workoutId)
    setRepeatError("")
    try {
      const result = await prepareRepeatWorkout({ data: { id: workoutId } })
      if (result.ok) {
        requestStart(editorFromRepeat(result.value), "repeat")
        return
      }
      if (result.error === "repeat_unavailable") {
        const names = result.unavailable
          ?.map((item) => item.variantName)
          .join(", ")
        setRepeatError(
          `Can’t repeat this workout because these exercises are unavailable: ${names}.`
        )
      } else setRepeatError("This workout is no longer available.")
    } catch {
      setRepeatError("We couldn’t prepare that workout. Please try again.")
    } finally {
      setRepeating(null)
    }
  }
  async function filterWorkouts(value: string) {
    setDate(value)
    try {
      // A date filter must show every workout on that day, not just the
      // default recent-list limit of 20.
      setWorkouts(
        await listWorkouts({
          data: value ? { from: value, to: value, limit: 100 } : {},
        })
      )
    } catch {
      setAnnouncement("We couldn’t load saved workouts. Please try again.")
    }
  }
  async function refreshWorkouts() {
    try {
      setWorkouts(
        await listWorkouts({ data: date ? { from: date, to: date } : {} })
      )
    } catch {
      // The saved workout is still reachable from the success screen; the
      // discovery list refreshes itself on the next visit or filter change.
    }
  }
  if (savedId)
    return (
      <Success
        id={savedId}
        onAnother={() => {
          setSavedId(null)
          blank()
        }}
      />
    )
  if (editor)
    return (
      <WorkoutEditor
        editor={editor}
        library={initialLibrary}
        draftId={activeDraft?.requestId}
        onDraftChange={(next) => {
          if (activeDraft) {
            const draft = makeWorkoutDraft(
              activeDraft.requestId,
              activeDraft.origin,
              next
            )
            setActiveDraft(draft)
            persist(draft)
          }
        }}
        onDiscard={() => {
          setEditor(null)
          clearPersisted()
          setRecoveredDraft(null)
          setActiveDraft(null)
        }}
        onSaved={(id) => {
          clearPersisted()
          setEditor(null)
          setRecoveredDraft(null)
          setActiveDraft(null)
          setSavedId(id)
          void refreshWorkouts()
        }}
      />
    )
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
      {recoveredDraft && (
        <section
          className="mb-6 border border-primary/30 bg-primary/5 p-4"
          aria-labelledby="draft-heading"
        >
          <h2 id="draft-heading" className="font-medium">
            Saved workout draft
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A {recoveredDraft.origin} workout draft was saved on this device.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              className="h-11"
              onPress={() => {
                const restored = {
                  ...recoveredDraft,
                  editor: reconcile(recoveredDraft.editor),
                }
                setActiveDraft(restored)
                setRecoveredDraft(null)
                setEditor(restored.editor)
              }}
            >
              Resume workout
            </Button>
            <Button
              className="h-11"
              variant="outline"
              onPress={() => setDiscardingDraft(true)}
            >
              Discard draft
            </Button>
          </div>
        </section>
      )}
      <section
        className="mb-6 border bg-muted/30 p-4"
        aria-labelledby="run-entry-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id="run-entry-heading" className="font-medium">
              Record a run
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Log a running workout without exercises or templates.
            </p>
          </div>
          <LinkButton className="h-11" to="/record/run">
            <FootprintsIcon aria-hidden="true" /> Record a run
          </LinkButton>
        </div>
      </section>
      {!hasLibrary ? (
        <div className="border border-dashed p-8 text-center">
          <DumbbellIcon className="mx-auto mb-3 size-7 text-muted-foreground" />
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
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium break-words">
                            {template.name}
                          </h3>
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
      <section className="mt-8" aria-labelledby="saved-workouts-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="saved-workouts-heading" className="font-medium">
              Saved workouts
            </h2>
            <p className="text-sm text-muted-foreground">
              Find a recent workout or choose a date.
            </p>
          </div>
          <label className="text-sm">
            Date{" "}
            <Input
              className="mt-1 h-11"
              type="date"
              value={date}
              onChange={(event) => filterWorkouts(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 space-y-2">
          {workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved workouts found.
            </p>
          ) : (
            workouts.map((workout) => (
              <div
                key={workout.id}
                className="flex flex-wrap items-center gap-2 border p-3"
              >
                <LinkButton
                  variant="ghost"
                  className="h-auto min-w-0 flex-1 justify-start p-0 text-left"
                  to="/record/$workoutId"
                  // LinkButton's React Aria wrapper erases typed-route params;
                  // cast the shape we know the route expects.
                  params={{ workoutId: workout.id } as never}
                >
                  <span className="min-w-0 break-words">
                    <span className="block min-w-0 font-medium break-words">
                      {workout.name || "Workout"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {workout.workoutDate} · {workout.exercises.length}{" "}
                      {workout.exercises.length === 1
                        ? "exercise"
                        : "exercises"}
                    </span>
                  </span>
                </LinkButton>
                <Button
                  className="h-11"
                  variant="outline"
                  isDisabled={repeating === workout.id}
                  onPress={() => void repeat(workout.id)}
                >
                  {repeating === workout.id ? "Preparing…" : "Repeat workout"}
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
      {pendingStart && (
        <AlertDialogContent
          isOpen
          onOpenChange={(open) => !open && setPendingStart(null)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Replace saved workout draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved draft will be replaced only if you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <Button
              onPress={() => begin(pendingStart.editor, pendingStart.origin)}
            >
              Replace draft
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
      {discardingDraft && (
        <AlertDialogContent
          isOpen
          onOpenChange={(open) => !open && setDiscardingDraft(false)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard saved workout draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onPress={() => {
                clearPersisted()
                setRecoveredDraft(null)
                setDiscardingDraft(false)
              }}
            >
              Discard draft
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
      {repeatError && (
        <AlertDialogContent isOpen onOpenChange={() => setRepeatError("")}>
          <AlertDialogHeader>
            <AlertDialogTitle>Workout can’t be repeated</AlertDialogTitle>
            <AlertDialogDescription>
              {repeatError}{" "}
              <LinkButton variant="link" className="h-auto p-0" to="/exercises">
                Manage exercise library
              </LinkButton>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
      <section className="mt-8" aria-labelledby="saved-runs-heading">
        <h2 id="saved-runs-heading" className="font-medium">
          Saved runs
        </h2>
        <p className="text-sm text-muted-foreground">
          Review or update a saved running workout.
        </p>
        <div className="mt-3 space-y-2">
          {initialRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved runs yet.</p>
          ) : (
            initialRuns.map((run) => (
              <LinkButton
                key={run.id}
                variant="outline"
                className="h-auto w-full justify-between p-3"
                to="/record/run/$runId"
                params={{ runId: run.id } as never}
              >
                <span className="min-w-0 break-words">
                  <span className="block min-w-0 font-medium break-words">
                    {run.workoutDate}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(run.distanceMetres / 1000).toFixed(2)} km ·{" "}
                    {Math.round(run.durationSeconds / 60)} min
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">Edit</span>
              </LinkButton>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
