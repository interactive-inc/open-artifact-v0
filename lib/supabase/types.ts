import type { User } from '@supabase/supabase-js'

export type UserType = 'guest' | 'regular'

export type SupabaseUser = User & {
  userType: UserType
}

/**
 * Get user type from email
 */
export function getUserType(email: string | undefined): UserType {
  if (!email) {
    return 'guest'
  }
  if (email.startsWith('guest-')) {
    return 'guest'
  }
  return 'regular'
}
