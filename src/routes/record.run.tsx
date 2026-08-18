import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/record/run")({
  component: () => <Outlet />,
})
