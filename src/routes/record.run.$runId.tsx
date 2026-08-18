import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"

import { RunEditor } from "@/running/run-editor"
import { readRunningWorkout } from "@/running/server-functions"

export const Route = createFileRoute("/record/run/$runId")({
  loader: async ({ params }) => {
    const run = await readRunningWorkout({ data: { id: params.runId } })
    if (!run) throw redirect({ to: "/record" })
    return run
  },
  pendingComponent: () => (
    <main className="mx-auto max-w-3xl p-4 md:p-8" role="status">
      Loading run…
    </main>
  ),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl p-4 md:p-8" role="alert">
      We couldn't load this run. Return to Record and try again.
    </main>
  ),
  component: RunEditPage,
})

function RunEditPage() {
  const run = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  async function returnToRecord() {
    // Invalidating the router refreshes Record plus any mounted/next-navigation
    // History and Progress loaders without forcing a browser reload.
    await router.invalidate()
    await navigate({ to: "/record" })
  }
  return (
    <RunEditor run={run} onSaved={returnToRecord} onDeleted={returnToRecord} />
  )
}
