import { useRouterState } from "@tanstack/react-router"
import {
  ActivityIcon,
  DumbbellIcon,
  HeartPulseIcon,
  ZapIcon,
  LogOutIcon,
} from "lucide-react"
import { useState } from "react"

import { logout } from "@/auth/server-functions"
import { Button } from "@/components/ui/button"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigation = [
  {
    label: "Training",
    to: "/sample",
    icon: DumbbellIcon,
  },
  {
    label: "Progress",
    to: "/sample-two",
    icon: ActivityIcon,
  },
  {
    label: "Recovery",
    to: "/sample-three",
    icon: HeartPulseIcon,
  },
]

export function AppSidebar() {
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              to="/sample"
              size="lg"
              tooltip="FORM"
              className="hover:bg-transparent"
            >
              <span className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <ZapIcon className="size-4" fill="currentColor" />
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold tracking-tight">FORM</span>
                <span className="text-[10px] font-normal text-sidebar-foreground/60">
                  Calisthenics training
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    to={item.to}
                    isActive={pathname === item.to}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="justify-start group-data-[collapsible=icon]:px-2"
          isDisabled={loggingOut}
          onPress={async () => {
            setLoggingOut(true)
            await logout()
            window.location.assign("/login")
          }}
        >
          <LogOutIcon />
          <span className="group-data-[collapsible=icon]:hidden">
            {loggingOut ? "Signing out…" : "Sign out"}
          </span>
        </Button>
        <p className="px-2 py-1 text-[10px] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
          Build strength. Move well.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
