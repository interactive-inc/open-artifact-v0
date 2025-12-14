import type { Context, Next } from 'hono'
import type { CookieMethodsServer } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { setCookie } from 'hono/cookie'
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

function parseCookieHeader(cookieHeader: string): Array<{ name: string; value: string }> {
  const cookies: Array<{ name: string; value: string }> = []
  const pairs = cookieHeader.split(';')

  for (const pair of pairs) {
    const trimmed = pair.trim()
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const name = trimmed.substring(0, eqIndex)
      const value = trimmed.substring(eqIndex + 1)
      cookies.push({ name, value })
    }
  }

  return cookies
}

function normalizeSameSite(value: boolean | 'lax' | 'strict' | 'none' | undefined): 'Strict' | 'Lax' | 'None' | undefined {
  if (value === undefined || value === false) {
    return undefined
  }
  if (value === true) {
    return 'Strict'
  }
  if (value === 'strict') {
    return 'Strict'
  }
  if (value === 'lax') {
    return 'Lax'
  }
  if (value === 'none') {
    return 'None'
  }
  return undefined
}

/**
 * Auth middleware for Hono
 */
export async function authMiddleware(c: Context<AuthContext>, next: Next) {
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      const cookieHeader = c.req.header('cookie') || ''
      return parseCookieHeader(cookieHeader)
    },
    setAll(cookiesToSet) {
      for (const cookie of cookiesToSet) {
        const sameSite = normalizeSameSite(cookie.options.sameSite)
        setCookie(c, cookie.name, cookie.value, {
          domain: cookie.options.domain,
          path: cookie.options.path,
          maxAge: cookie.options.maxAge,
          expires: cookie.options.expires,
          secure: cookie.options.secure,
          httpOnly: cookie.options.httpOnly,
          sameSite,
        })
      }
    },
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: cookieMethods,
  })

  const response = await supabase.auth.getUser()

  if (response.data.user) {
    c.set('user', {
      id: response.data.user.id,
      email: response.data.user.email,
      type: getUserType(response.data.user.email),
    })
  }

  if (!response.data.user) {
    c.set('user', null)
  }

  await next()
}

/**
 * Require auth middleware for Hono
 */
export function requireAuth(c: Context<AuthContext>, next: Next) {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  return next()
}
