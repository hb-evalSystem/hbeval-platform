// lib/supabase/admin.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY Supabase client holding the service_role key.
//
// SECURITY — read before editing:
//   • This client BYPASSES Row Level Security. It must NEVER be imported into
//     a Client Component or any file that ships to the browser.
//   • The service_role key lives only in SUPABASE_SERVICE_ROLE_KEY (no
//     NEXT_PUBLIC_ prefix), so Next.js never exposes it to the client bundle.
//   • Use this ONLY inside Route Handlers / server actions for privileged
//     operations the user is not allowed to perform directly (here: writing
//     encrypted agent secrets that RLS forbids the browser from touching).
//
// The "import 'server-only'" line makes the build FAIL if this module is ever
// pulled into a client bundle — a compile-time guarantee, not a convention.
//
// LAZY INITIALISATION — why:
//   The client is created on FIRST USE, not at import time. Creating it at
//   import time made `next build` fail while statically analysing the API
//   routes, because the env vars are not present during that analysis step.
//   A Proxy defers creation until a property is actually accessed at runtime,
//   when the env vars ARE present. Behaviour and security are unchanged.
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and ' +
      'SUPABASE_SERVICE_ROLE_KEY to be set.'
    )
  }

  // No session persistence: this is a stateless privileged client.
  _client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// Exported as a Proxy so existing code can keep calling `supabaseAdmin.from(...)`
// unchanged, while the real client is created lazily on first property access.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
