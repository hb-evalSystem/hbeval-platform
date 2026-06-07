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
// The "import 'server-only'" line below makes the build FAIL if this module is
// ever pulled into a client bundle — a compile-time guarantee, not a convention.
import 'server-only'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error(
    'Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and ' +
    'SUPABASE_SERVICE_ROLE_KEY to be set.'
  )
}

// No session persistence: this is a stateless privileged client.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
