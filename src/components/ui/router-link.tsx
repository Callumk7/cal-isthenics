import { createLink } from "@tanstack/react-router"
import type { LinkComponent } from "@tanstack/react-router"
import { Link as ReactAriaLink } from "react-aria-components"

const CreatedRouterLink = createLink(ReactAriaLink)

/**
 * React Aria link with TanStack Router navigation and intent preloading.
 * Use `to` and the other TanStack Router link options rather than `href`.
 */
const RouterLink: LinkComponent<typeof ReactAriaLink> = (props) => (
  <CreatedRouterLink preload="intent" {...props} />
)

export { RouterLink }
