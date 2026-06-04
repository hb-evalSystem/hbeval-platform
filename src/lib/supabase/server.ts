// lib/supabase/server.ts
// Server-side Supabase client — used in Server Components and Route Handlers.
// This version reads/writes cookies via the Next.js cookies() API,
// which is only available on the server. Never import this in a Client Component.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can throw in read-only Server Components — safe to ignore
            // because the middleware handles session refresh separately.
          }
        },
      },
    }
  )
}
