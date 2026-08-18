import { createFileRoute, useRouter } from "@tanstack/react-router"

import { RunRecorder } from "@/running/run-recorder"

export const Route = createFileRoute("/record/run/")({
  component: RunRecordPage,
})

function RunRecordPage() {
  const router = useRouter()
  return <RunRecorder onCreated={() => router.invalidate()} />
}
