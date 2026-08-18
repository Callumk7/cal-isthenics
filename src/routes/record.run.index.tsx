import { createFileRoute } from "@tanstack/react-router"

import { RunRecorder } from "@/running/run-recorder"

export const Route = createFileRoute("/record/run/")({
  component: RunRecorder,
})
