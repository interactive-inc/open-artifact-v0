import { zValidator } from "@hono/zod-validator"
import { type CookieMethodsServer, createServerClient } from "@supabase/ssr"
import type { Context } from "hono"
import { setCookie } from "hono/cookie"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { ensureUserExists } from "@/lib/db/queries"
import { factory } from "../factory"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key"

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(1, "Password is required."),
})

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
})

function parseCookieHeader(
  cookieHeader: string,
): Array<{ name: string; value: string }> {
  const cookies: Array<{ name: string; value: string }> = []
  const pairs = cookieHeader.split(";")

  for (const pair of pairs) {
    const trimmed = pair.trim()
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex > 0) {
      const name = trimmed.substring(0, eqIndex)
      const value = trimmed.substring(eqIndex + 1)
      cookies.push({ name, value })
    }
  }

  return cookies
}

function normalizeSameSite(
  value: boolean | "lax" | "strict" | "none" | undefined,
): "Strict" | "Lax" | "None" | undefined {
  if (value === undefined || value === false) {
    return undefined
  }
  if (value === true) {
    return "Strict"
  }
  if (value === "strict") {
    return "Strict"
  }
  if (value === "lax") {
    return "Lax"
  }
  if (value === "none") {
    return "None"
  }
  return undefined
}

function createCookieMethods(c: Context): CookieMethodsServer {
  return {
    getAll() {
      const cookieHeader = c.req.header("cookie") || ""
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
}

function createSupabaseClient(c: Context) {
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: createCookieMethods(c),
  })
}

export const signInHandlers = factory.createHandlers(
  zValidator("json", signInSchema),
  async (c) => {
    const body = c.req.valid("json")
    const supabase = createSupabaseClient(c)

    const response = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (response.error) {
      console.error(
        "Supabase signIn error:",
        response.error.message,
        response.error.code,
      )
      throw new HTTPException(400, { message: response.error.message })
    }

    if (!response.data.session) {
      console.error("No session returned after signIn")
      throw new HTTPException(400, {
        message: "Failed to create session. Please try again.",
      })
    }

    await ensureUserExists({
      id: response.data.user.id,
      email: response.data.user.email ?? "",
    })

    return c.json({
      type: "success" as const,
      message: "Signed in successfully",
    })
  },
)

export const signUpHandlers = factory.createHandlers(
  zValidator("json", signUpSchema),
  async (c) => {
    const body = c.req.valid("json")
    const supabase = createSupabaseClient(c)

    const response = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    })

    if (response.error) {
      throw new HTTPException(400, { message: response.error.message })
    }

    if (response.data.user) {
      await ensureUserExists({
        id: response.data.user.id,
        email: response.data.user.email ?? "",
      })
    }

    return c.json({
      type: "success" as const,
      message: "Signed up successfully",
    })
  },
)

export const signOutHandlers = factory.createHandlers(async (c) => {
  const supabase = createSupabaseClient(c)
  await supabase.auth.signOut()
  return c.json({
    type: "success" as const,
    message: "Signed out successfully",
  })
})
