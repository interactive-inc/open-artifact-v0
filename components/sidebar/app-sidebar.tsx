'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Plus, Home } from 'lucide-react'
import { useChats } from '@/hooks/api/use-chats'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const pathname = usePathname()
  const chatsQuery = useChats()

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Home className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">v0 Clone</span>
                  <span className="text-xs text-muted-foreground">AI UI Generator</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'}>
                  <Link href="/">
                    <Plus className="size-4" />
                    <span>New Project</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {chatsQuery.isLoading && (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span className="text-muted-foreground">Loading...</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {chatsQuery.data?.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/chats/${chat.id}`}
                  >
                    <Link href={`/chats/${chat.id}`}>
                      <MessageSquare className="size-4" />
                      <span className="truncate">
                        {chat.title || `Chat ${chat.id.slice(0, 8)}`}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
