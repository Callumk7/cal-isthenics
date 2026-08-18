import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { listActiveExercises } from "@/exercises/server-functions"
import {
  editorFromWorkout,
  Success,
  WorkoutEditor,
} from "@/record/workout-editor"
import { deleteWorkout, readWorkout } from "@/workouts/server-functions"

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
  const [savedId, setSavedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  if (savedId)
    return (
      <Success id={savedId} onAnother={() => navigate({ to: "/record" })} />
    )
  async function remove() {
    setDeleting(true)
    setDeleteError("")
    try {
      const result = await deleteWorkout({ data: { id: workout.id } })
      if (result.ok) {
        navigate({ to: "/record" })
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
      <WorkoutEditor
        editor={editorFromWorkout(workout)}
        library={library}
        workoutId={workout.id}
        onDiscard={() => navigate({ to: "/record" })}
        onSaved={setSavedId}
      />
      <div className="mx-auto -mt-6 w-full max-w-3xl px-4 pb-8 md:px-8">
        <Button
          variant="destructive"
          className="h-11"
          onPress={() => setDeleteOpen(true)}
        >
          Delete workout
        </Button>
      </div>
      <AlertDialog isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent isDismissable={!deleting}>
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
            <Button
              variant="destructive"
              isDisabled={deleting}
              onPress={remove}
            >
              {deleting ? "Deleting…" : "Delete workout"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
