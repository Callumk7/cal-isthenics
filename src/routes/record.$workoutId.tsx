import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { listActiveExercises } from "@/exercises/server-functions"
import {
  editorFromWorkout,
  Success,
  WorkoutDeleteDialog,
  WorkoutEditor,
} from "@/record/workout-editor"
import { readWorkout } from "@/workouts/server-functions"

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
  if (savedId)
    return (
      <Success id={savedId} onAnother={() => navigate({ to: "/record" })} />
    )
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
        <WorkoutDeleteDialog
          workoutId={workout.id}
          onDeleted={() => navigate({ to: "/record" })}
        />
      </div>
    </>
  )
}
