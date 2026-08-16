import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import {
  DEFAULT_AUTHENTICATED_PATH,
  getLoginHref,
  getSafeReturnTo,
} from "@/auth/access"
import { getAuthState } from "@/auth/server-functions"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const { authenticated } = await getAuthState()
    const isLogin = location.pathname === "/login"

    if (!authenticated && !isLogin) {
      throw redirect({
        href: getLoginHref(location.pathname, location.searchStr),
      })
    }

    if (authenticated && isLogin) {
      const returnTo = getSafeReturnTo(
        new URLSearchParams(location.searchStr).get("returnTo")
      )
      throw redirect({ href: returnTo ?? DEFAULT_AUTHENTICATED_PATH })
    }
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "FORM — Calisthenics Training",
      },
      {},
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </div>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const isLogin = useRouterState({
    select: (state) => state.location.pathname === "/login",
  })
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {isLogin ? (
          children
        ) : (
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs font-medium">Training workspace</span>
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        )}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
