import { useState } from "react"
import { useRouterState } from "@tanstack/react-router"
import {
  BookOpenIcon,
  ChartNoAxesColumnIncreasingIcon,
  ClipboardListIcon,
  DumbbellIcon,
  HistoryIcon,
  LogOutIcon,
  ZapIcon,
} from "lucide-react"

import { logout } from "@/auth/server-functions"
import { Button } from "@/components/ui/button"
import { RouterLink } from "@/components/ui/router-link"
import { cn } from "@/lib/utils"

export function isNavActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

const navigation = [
  { label: "Progress", to: "/progress", icon: ChartNoAxesColumnIncreasingIcon },
  { label: "Record", to: "/record", icon: ClipboardListIcon },
  { label: "History", to: "/history", icon: HistoryIcon },
  { label: "Templates", to: "/templates", icon: BookOpenIcon },
  { label: "Exercises", to: "/exercises", icon: DumbbellIcon },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [loggingOut, setLoggingOut] = useState(false)
  const current = navigation.find((item) => isNavActive(pathname, item.to))

  async function signOut() {
    setLoggingOut(true)
    await logout()
    window.location.assign("/login")
  }

  return (
    <div className="min-h-svh bg-muted/30 md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-background md:flex">
        <Brand />
        <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
          {navigation.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              active={isNavActive(pathname, item.to)}
            />
          ))}
        </nav>
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="h-11 w-full justify-start"
            isDisabled={loggingOut}
            onPress={signOut}
          >
            <LogOutIcon aria-hidden="true" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </aside>

      <div className="min-w-0 md:col-start-2">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Brand compact />
          <Button
            variant="ghost"
            size="icon"
            aria-label={loggingOut ? "Signing out" : "Sign out"}
            isDisabled={loggingOut}
            onPress={signOut}
          >
            <LogOutIcon aria-hidden="true" />
          </Button>
        </header>
        <div className="hidden h-14 items-center border-b bg-background px-8 md:flex">
          <p className="text-sm font-medium">{current?.label ?? "FORM"}</p>
        </div>
        <main className="pb-24 md:pb-0">{children}</main>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-5 border-t bg-background/98 px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navigation.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            active={isNavActive(pathname, item.to)}
            mobile
          />
        ))}
      </nav>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "" : "h-14 border-b px-4"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
        <ZapIcon className="size-4" fill="currentColor" aria-hidden="true" />
      </span>
      <span className="font-semibold tracking-tight">FORM</span>
    </div>
  )
}

function NavItem({
  label,
  to,
  icon: Icon,
  active,
  mobile = false,
}: (typeof navigation)[number] & { active: boolean; mobile?: boolean }) {
  return (
    <RouterLink
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/10 font-medium text-primary",
        mobile
          ? "min-w-0 flex-col justify-center gap-1 rounded-none px-0.5 text-[10px]"
          : "gap-3 px-3 text-sm"
      )}
    >
      <Icon className={mobile ? "size-5" : "size-4"} aria-hidden="true" />
      <span className="max-w-full truncate">{label}</span>
      {mobile && active && (
        <span className="absolute inset-x-3 top-0 h-0.5 bg-primary" />
      )}
    </RouterLink>
  )
}
