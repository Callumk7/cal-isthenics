import { createFileRoute } from "@tanstack/react-router"

import { listActiveExercises } from "@/exercises/server-functions"
import { RecordManager } from "@/record/record-manager"
import { listWorkoutTemplateSummaries } from "@/templates/server-functions"
import { listWorkouts } from "@/workouts/server-functions"

export const Route = createFileRoute("/record")({
  loader: async () => {
    const [templates, library, workouts] = await Promise.all([
      listWorkoutTemplateSummaries(),
      listActiveExercises(),
      listWorkouts(),
    ])
    return { templates, library, workouts }
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
  const { templates, library, workouts } = Route.useLoaderData()
  return (
    <RecordManager
      initialTemplates={templates}
      initialLibrary={library}
      initialWorkouts={workouts}
    />
  )
}
