import { createFileRoute } from "@tanstack/react-router"
import { HistoryIcon } from "lucide-react"
import { EmptyDestination } from "@/components/empty-destination"

export const Route = createFileRoute("/history")({ component: HistoryPage })
function HistoryPage() {
  return (
    <EmptyDestination
      title="History"
      description="Completed workouts will be collected here so you can review what you did and when."
      icon={HistoryIcon}
    />
  )
}
