import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { guestRegex } from "./lib/constants"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 })
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    console.error(
      "❌ Missing Supabase environment variables. Please check your .env file.",
    )
    return NextResponse.next()
  }

  const sessionResult = await updateSession(request)
  const supabaseResponse = sessionResult.supabaseResponse
  const user = sessionResult.user

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return supabaseResponse
    }

    if (pathname === "/") {
      return supabaseResponse
    }

    if (["/chats", "/projects"].some((path) => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    if (["/login", "/register"].includes(pathname)) {
      return supabaseResponse
    }

    return NextResponse.redirect(new URL("/login", request.url))
  }

  const isGuest = guestRegex.test(user?.email ?? "")

  if (user && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/",
    "/chats/:path*",
    "/projects/:path*",
    "/api/:path*",
    "/login",
    "/register",
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
