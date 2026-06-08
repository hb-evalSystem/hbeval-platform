// app/api/account/consent/route.ts
// Records that the authenticated user accepted a specific legal version.
// Called right after sign-up. Best-effort: registration also stores the version
// in user metadata, so a failure here never blocks account creation.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Right after signUp the session may not be active yet (email confirm flow);
    // we simply no-op so the client never sees an error.
    return NextResponse.json({ ok: true, recorded: false }, { status: 200 })
  }

  let body: any
  try { body = await req.json() } catch { body = {} }
  const legalVersion = String(body.legal_version ?? '').trim().slice(0, 32)
  if (!legalVersion) {
    return NextResponse.json({ error: 'Missing legal_version.' }, { status: 400 })
  }

  // Upsert so re-acceptance of the same version is idempotent.
  const { error } = await supabaseAdmin
    .from('user_consents')
    .upsert({ user_id: user.id, legal_version: legalVersion }, { onConflict: 'user_id,legal_version' })

  if (error) {
    return NextResponse.json({ ok: true, recorded: false }, { status: 200 })
  }
  return NextResponse.json({ ok: true, recorded: true }, { status: 200 })
}
