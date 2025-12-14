import { AuthRequired } from "@/components/auth/auth-required"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@/lib/supabase/auth"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    return <AuthRequired />
  }

  return (
    <SidebarProvider className="h-full min-h-0">
      <AppSidebar />
      <SidebarInset className="h-full overflow-hidden">{children}</SidebarInset>
    </SidebarProvider>
  )
}
