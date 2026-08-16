import { createFileRoute } from "@tanstack/react-router"
import { BookOpenIcon } from "lucide-react"
import { EmptyDestination } from "@/components/empty-destination"

export const Route = createFileRoute("/templates")({ component: TemplatesPage })
function TemplatesPage() {
  return (
    <EmptyDestination
      title="Templates"
      description="Save reusable workout structures here to make future logging faster."
      icon={BookOpenIcon}
    />
  )
}
