import 'server-only'

import { createClient } from './server'
import { getUserType, type UserType } from './types'

type AuthSession = {
  user: {
    id: string
    email: string | undefined
    type: UserType
  }
} | null

/**
 * Get current session from Supabase
 */
export async function auth(): Promise<AuthSession> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    return null
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      type: getUserType(data.user.email),
    },
  }
}
