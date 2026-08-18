import { useState } from "react"
import { DumbbellIcon, FootprintsIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, LinkButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { localCalendarToday } from "@/lib/date"
import type { ActiveCategory } from "@/templates/template-manager"
import type {
  WorkoutTemplateDetail,
  WorkoutTemplateSummary,
} from "@/templates/templates"
import type { RunningWorkout } from "@/running/running-workouts"
import { readWorkoutTemplate } from "@/templates/server-functions"
import { listWorkouts } from "@/workouts/server-functions"
import { Success, WorkoutEditor } from "./workout-editor"
import type { Editor } from "./workout-editor"

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
  const hasLibrary = initialLibrary.some(
    (category) =>
      category.archivedAt === null &&
      category.variants.some((variant) => variant.archivedAt === null)
  )
  const blank = () =>
    setEditor({ date: localCalendarToday(), name: "", notes: "", rows: [] })
  async function startTemplate(template: WorkoutTemplateSummary) {
    setLoadingTemplate(template.id)
    try {
      const detail = await readWorkoutTemplate({ data: { id: template.id } })
      if (!detail || !detail.canStart) {
        setAnnouncement("This template is no longer eligible to start.")
        return
      }
      setEditor({
        templateId: detail.id,
        date: localCalendarToday(),
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
        onDiscard={() => setEditor(null)}
        onSaved={(id) => {
          setEditor(null)
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
              <LinkButton
                key={workout.id}
                variant="outline"
                className="h-auto w-full justify-between p-3"
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
                    {workout.exercises.length === 1 ? "exercise" : "exercises"}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">View</span>
              </LinkButton>
            ))
          )}
        </div>
      </section>
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
