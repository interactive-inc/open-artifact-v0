import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

type ResponseHolder = {
  response: NextResponse
}

function normalizeSameSite(value: boolean | 'lax' | 'strict' | 'none' | undefined): 'lax' | 'strict' | 'none' | undefined {
  if (value === undefined || value === false) {
    return undefined
  }
  if (value === true) {
    return 'strict'
  }
  if (value === 'strict' || value === 'lax' || value === 'none') {
    return value
  }
  return undefined
}

/**
 * Update Supabase session in middleware
 */
export async function updateSession(request: NextRequest) {
  const responseHolder: ResponseHolder = {
    response: NextResponse.next({ request }),
  }

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      for (const cookie of cookiesToSet) {
        request.cookies.set(cookie.name, cookie.value)
      }
      responseHolder.response = NextResponse.next({ request })
      for (const cookie of cookiesToSet) {
        const sameSite = normalizeSameSite(cookie.options.sameSite)
        responseHolder.response.cookies.set(cookie.name, cookie.value, {
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

  const userResponse = await supabase.auth.getUser()

  return { supabaseResponse: responseHolder.response, user: userResponse.data.user }
}
