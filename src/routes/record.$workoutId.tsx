import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useState } from "react"

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, LinkButton } from "@/components/ui/button"
import { listActiveExercises } from "@/exercises/server-functions"
import {
  editorFromRepeat,
  editorFromWorkout,
  Success,
  WorkoutDeleteDialog,
  WorkoutEditor,
} from "@/record/workout-editor"
import { prepareRepeatWorkout, readWorkout } from "@/workouts/server-functions"

export const Route = createFileRoute("/record/$workoutId")({
  loader: async ({ params }) => {
    const [workout, library] = await Promise.all([
      readWorkout({ data: { id: params.workoutId } }),
      listActiveExercises(),
    ])
    if (!workout) throw redirect({ to: "/record" })
    return { workout, library }
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="status">
      Loading workout…
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="alert">
      We couldn't load this workout. Return to Record and try again.
    </div>
  ),
  component: WorkoutPage,
})

function WorkoutPage() {
  const { workout, library } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [savedId, setSavedId] = useState<string | null>(null)
  const [repeatEditor, setRepeatEditor] = useState<ReturnType<
    typeof editorFromRepeat
  > | null>(null)
  const [repeating, setRepeating] = useState(false)
  const [repeatConfirm, setRepeatConfirm] = useState(false)
  const [repeatError, setRepeatError] = useState("")
  async function repeat() {
    setRepeating(true)
    setRepeatError("")
    try {
      const result = await prepareRepeatWorkout({ data: { id: workout.id } })
      if (result.ok) setRepeatEditor(editorFromRepeat(result.value))
      else if (result.error === "repeat_unavailable")
        setRepeatError(
          `Can’t repeat this workout because these exercises are unavailable: ${result.unavailable?.map((item) => item.variantName).join(", ")}.`
        )
      else setRepeatError("This workout is no longer available.")
    } catch {
      setRepeatError("We couldn’t prepare that workout. Please try again.")
    } finally {
      setRepeating(false)
    }
  }
  async function returnToRecord() {
    // Keep history and progress loader data coherent after a calisthenics
    // mutation, matching the running-workout edit flow.
    await router.invalidate()
    await navigate({ to: "/record" })
  }
  if (savedId)
    return <Success id={savedId} onAnother={() => void returnToRecord()} />
  if (repeatEditor)
    return (
      <WorkoutEditor
        editor={repeatEditor}
        library={library}
        onDiscard={() => setRepeatEditor(null)}
        onSaved={(id) => {
          void router.invalidate()
          setSavedId(id)
        }}
      />
    )
  return (
    <>
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId={workout.id}
        onDiscard={() => navigate({ to: "/record" })}
        onSaved={(id) => {
          void router.invalidate()
          setSavedId(id)
        }}
      />
      <div className="mx-auto -mt-6 flex w-full max-w-3xl flex-wrap gap-2 px-4 pb-8 md:px-8">
        <Button
          className="h-11"
          variant="outline"
          isDisabled={repeating}
          onPress={() => setRepeatConfirm(true)}
        >
          {repeating ? "Preparing…" : "Repeat workout"}
        </Button>
        <WorkoutDeleteDialog
          workoutId={workout.id}
          onDeleted={() => void returnToRecord()}
        />
      </div>
      {repeatConfirm && (
        <AlertDialogContent isOpen onOpenChange={setRepeatConfirm}>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new repeated workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current local editor. Your saved workout will
              not change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => void repeat()}>
              Repeat workout
            </AlertDialogAction>
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
    </>
  )
}
