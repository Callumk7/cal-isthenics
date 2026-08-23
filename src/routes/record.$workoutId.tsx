import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useState } from "react"

import {
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
import {
  clearWorkoutDraft,
  makeWorkoutDraft,
  readWorkoutDraft,
  writeWorkoutDraft,
} from "@/record/workout-draft-storage"
import type { WorkoutDraft } from "@/record/workout-draft-storage"
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
  const [repeatDraft, setRepeatDraft] = useState<WorkoutDraft | null>(null)
  const [pendingRepeat, setPendingRepeat] = useState<ReturnType<
    typeof editorFromRepeat
  > | null>(null)
  const [repeating, setRepeating] = useState(false)
  const [repeatError, setRepeatError] = useState("")
  const [draftStorageError, setDraftStorageError] = useState("")
  function startRepeat(editor: ReturnType<typeof editorFromRepeat>) {
    const draft = makeWorkoutDraft(crypto.randomUUID(), "repeat", editor)
    if (!writeWorkoutDraft(window.localStorage, draft))
      setDraftStorageError(
        "Draft recovery is unavailable in this browser. Your workout remains open, but it may not survive a refresh."
      )
    setRepeatDraft(draft)
    setRepeatEditor(editor)
    setPendingRepeat(null)
  }
  async function repeat() {
    setRepeating(true)
    setRepeatError("")
    try {
      const result = await prepareRepeatWorkout({ data: { id: workout.id } })
      if (result.ok) {
        const editor = editorFromRepeat(result.value)
        const existing = readWorkoutDraft(window.localStorage)
        if (existing.kind === "draft") setPendingRepeat(editor)
        else {
          if (existing.kind === "unavailable")
            setDraftStorageError(
              "Draft recovery is unavailable in this browser."
            )
          if (existing.kind === "invalid")
            setDraftStorageError(
              "An unreadable saved workout draft was removed."
            )
          startRepeat(editor)
        }
      } else if (result.error === "repeat_unavailable")
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
        key="repeat"
        editor={repeatEditor}
        library={library}
        draftId={repeatDraft?.requestId}
        onDraftChange={(editor) => {
          if (!repeatDraft) return
          const draft = makeWorkoutDraft(
            repeatDraft.requestId,
            "repeat",
            editor
          )
          if (!writeWorkoutDraft(window.localStorage, draft))
            setDraftStorageError(
              "Draft recovery is unavailable in this browser. Your workout remains open, but it may not survive a refresh."
            )
          setRepeatDraft(draft)
        }}
        onDiscard={() => {
          if (!clearWorkoutDraft(window.localStorage))
            setDraftStorageError(
              "Draft recovery is unavailable in this browser."
            )
          setRepeatDraft(null)
          setRepeatEditor(null)
        }}
        onSaved={(id) => {
          if (!clearWorkoutDraft(window.localStorage))
            setDraftStorageError(
              "Draft recovery is unavailable in this browser."
            )
          setRepeatDraft(null)
          void router.invalidate()
          setSavedId(id)
        }}
      />
    )
  return (
    <>
      {draftStorageError && (
        <p className="sr-only" role="status" aria-live="polite">
          {draftStorageError}
        </p>
      )}
      <WorkoutEditor
        key="source"
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
          onPress={() => void repeat()}
        >
          {repeating ? "Preparing…" : "Repeat workout"}
        </Button>
        <WorkoutDeleteDialog
          workoutId={workout.id}
          onDeleted={() => void returnToRecord()}
        />
      </div>
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
      {pendingRepeat && (
        <AlertDialogContent
          isOpen
          onOpenChange={(open) => !open && setPendingRepeat(null)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Replace saved workout draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved draft will be replaced only if you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <Button onPress={() => startRepeat(pendingRepeat)}>
              Replace draft
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </>
  )
}
