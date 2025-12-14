import { auth } from '@/lib/supabase/auth'
import { AuthRequired } from '@/components/auth/auth-required'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    return <AuthRequired />
  }

  return <>{children}</>
}
