import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/record")({
  // Layout route: /record renders the discovery page (record.index) and
  // /record/$workoutId renders the detail/edit page (record.$workoutId).
  // The layout itself loads nothing, so the nested edit route can never be
  // blocked by a failure in the discovery view's loader.
  component: () => <Outlet />,
})
