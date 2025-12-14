import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { createServerClient } from '@supabase/ssr'
import { setCookie } from 'hono/cookie'
import { ensureUserExists } from '@/lib/db/queries'
import { factory } from '../factory'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

function createSupabaseClient(c: any) {
  return createServerClient(supabaseUrl, supabasePublishableKey, {
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
}

export const signInHandlers = factory.createHandlers(
  zValidator('json', signInSchema),
  async (c) => {
    const body = c.req.valid('json')
    const supabase = createSupabaseClient(c)

    const { error, data } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) {
      console.error('Supabase signIn error:', error.message, error.code)
      throw new HTTPException(400, { message: error.message })
    }

    if (!data.session) {
      console.error('No session returned after signIn')
      throw new HTTPException(400, { message: 'Failed to create session. Please try again.' })
    }

    await ensureUserExists({
      id: data.user.id,
      email: data.user.email ?? '',
    })

    return c.json({ type: 'success' as const, message: 'Signed in successfully' })
  },
)

export const signUpHandlers = factory.createHandlers(
  zValidator('json', signUpSchema),
  async (c) => {
    const body = c.req.valid('json')
    const supabase = createSupabaseClient(c)

    const { error, data } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    })

    if (error) {
      throw new HTTPException(400, { message: error.message })
    }

    if (data.user) {
      await ensureUserExists({
        id: data.user.id,
        email: data.user.email ?? '',
      })
    }

    return c.json({ type: 'success' as const, message: 'Signed up successfully' })
  },
)

export const signOutHandlers = factory.createHandlers(async (c) => {
  const supabase = createSupabaseClient(c)
  await supabase.auth.signOut()
  return c.json({ type: 'success' as const, message: 'Signed out successfully' })
})
