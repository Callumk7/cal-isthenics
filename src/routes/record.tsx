import { createFileRoute } from "@tanstack/react-router"
import { ClipboardListIcon } from "lucide-react"
import { EmptyDestination } from "@/components/empty-destination"

export const Route = createFileRoute("/record")({ component: RecordPage })
function RecordPage() {
  return (
    <EmptyDestination
      title="Record a workout"
      description="Log a completed workout here, including exercises, sets, reps, and notes."
      icon={ClipboardListIcon}
    />
  )
}
