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
  const response = await supabase.auth.getUser()

  if (!response.data.user) {
    return null
  }

  return {
    user: {
      id: response.data.user.id,
      email: response.data.user.email,
      type: getUserType(response.data.user.email),
    },
  }
}
