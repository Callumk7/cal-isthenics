import { createFileRoute } from "@tanstack/react-router"
import { ChartNoAxesColumnIncreasingIcon } from "lucide-react"
import { EmptyDestination } from "@/components/empty-destination"

export const Route = createFileRoute("/progress")({ component: ProgressPage })
function ProgressPage() {
  return (
    <EmptyDestination
      title="Progress"
      description="Your training trends and personal bests will appear here after you record workouts."
      icon={ChartNoAxesColumnIncreasingIcon}
    />
  )
}
