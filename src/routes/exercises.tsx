import { createFileRoute } from "@tanstack/react-router"
import { DumbbellIcon } from "lucide-react"
import { EmptyDestination } from "@/components/empty-destination"

export const Route = createFileRoute("/exercises")({ component: ExercisesPage })
function ExercisesPage() {
  return (
    <EmptyDestination
      title="Exercises"
      description="Your exercise library will live here, ready to use when recording a workout."
      icon={DumbbellIcon}
    />
  )
}
