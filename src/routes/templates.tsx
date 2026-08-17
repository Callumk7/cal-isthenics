import { createFileRoute } from "@tanstack/react-router"

import { listActiveExercises } from "@/exercises/server-functions"
import { TemplateManager } from "@/templates/template-manager"
import { listWorkoutTemplateSummaries } from "@/templates/server-functions"

export const Route = createFileRoute("/templates")({
  loader: async () => {
    const [templates, library] = await Promise.all([
      listWorkoutTemplateSummaries(),
      listActiveExercises(),
    ])
    return { templates, library }
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="status">
      Loading templates…
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-3xl p-4 md:p-8" role="alert">
      We couldn't load your templates. Refresh the page to try again.
    </div>
  ),
  component: TemplatesPage,
})

function TemplatesPage() {
  const { templates, library } = Route.useLoaderData()
  return (
    <TemplateManager initialTemplates={templates} initialLibrary={library} />
  )
}
