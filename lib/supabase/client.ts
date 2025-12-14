"use client"

import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key"

/**
 * Create Supabase client for browser
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey)
}
