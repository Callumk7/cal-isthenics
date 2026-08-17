import { createFileRoute } from "@tanstack/react-router"

import { ExerciseLibraryManager } from "@/exercises/library-manager"
import { listManagedExercises } from "@/exercises/server-functions"

export const Route = createFileRoute("/exercises")({
  loader: () => listManagedExercises(),
  pendingComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="status">
      Loading exercise library…
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="alert">
      We couldn’t load your exercise library. Refresh the page to try again.
    </div>
  ),
  component: ExercisesPage,
})

function ExercisesPage() {
  return <ExerciseLibraryManager initialCategories={Route.useLoaderData()} />
}
