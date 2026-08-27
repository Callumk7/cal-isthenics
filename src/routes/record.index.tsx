import { createFileRoute } from "@tanstack/react-router"

import { listActiveExercises } from "@/exercises/server-functions"
import { RecordManager } from "@/record/record-manager"
import { listRunningWorkouts } from "@/running/server-functions"
import { listWorkoutTemplateSummaries } from "@/templates/server-functions"
import { listWorkouts } from "@/workouts/server-functions"

export const Route = createFileRoute("/record/")({
  loader: async () => {
    // Starting a workout only depends on templates and the active library.
    // Keep those dependencies separate from the two discovery panels so a
    // transient history failure never prevents logging a workout.
    const [templates, library, workouts, runs] = await Promise.all([
      listWorkoutTemplateSummaries(),
      listActiveExercises(),
      listWorkouts().then(
        (value) => ({ value, failed: false }),
        () => ({ value: [], failed: true })
      ),
      listRunningWorkouts().then(
        (result) => ({
          value: result.ok ? result.value : [],
          failed: !result.ok,
        }),
        () => ({ value: [], failed: true })
      ),
    ])
    return {
      templates,
      library,
      workouts: workouts.value,
      workoutsFailed: workouts.failed,
      runs: runs.value,
      runsFailed: runs.failed,
    }
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="status">
      Loading workout recorder…
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="alert">
      We couldn't load the workout recorder. Refresh the page to try again.
    </div>
  ),
  component: RecordPage,
})

function RecordPage() {
  const { templates, library, workouts, workoutsFailed, runs, runsFailed } =
    Route.useLoaderData()
  return (
    <RecordManager
      initialTemplates={templates}
      initialLibrary={library}
      initialWorkouts={workouts}
      initialWorkoutsFailed={workoutsFailed}
      initialRuns={runs}
      initialRunsFailed={runsFailed}
    />
  )
}
