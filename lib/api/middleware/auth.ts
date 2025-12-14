import type { Context, Next } from 'hono'
import { createServerClient } from '@supabase/ssr'
import { getCookie, setCookie } from 'hono/cookie'
import { getUserType } from '@/lib/supabase/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

export type AuthUser = {
  id: string
  email: string | undefined
  type: ReturnType<typeof getUserType>
}

export type AuthContext = {
  Variables: {
    user: AuthUser | null
  }
}

export async function authMiddleware(c: Context<AuthContext>, next: Next) {
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        const cookieHeader = c.req.header('cookie') || ''
        const cookies: Array<{ name: string; value: string }> = []

        for (const pair of cookieHeader.split(';')) {
          const trimmed = pair.trim()
          const eqIndex = trimmed.indexOf('=')
          if (eqIndex > 0) {
            const name = trimmed.substring(0, eqIndex)
            const value = trimmed.substring(eqIndex + 1)
            cookies.push({ name, value })
          }
        }

        return cookies
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          setCookie(c, cookie.name, cookie.value, cookie.options as any)
        }
      },
    },
  })

  const { data } = await supabase.auth.getUser()

  if (data.user) {
    c.set('user', {
      id: data.user.id,
      email: data.user.email,
      type: getUserType(data.user.email),
    })
  } else {
    c.set('user', null)
  }

  await next()
}

export function requireAuth(c: Context<AuthContext>, next: Next) {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  return next()
}
