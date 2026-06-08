// app/api/billing/notify/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pre-launch Pro interest capture. Stores an email (and the user id if signed
// in) in pro_interest. This is the soft action behind the Billing "Notify me"
// button; when Stripe launches, the button will instead start a Checkout
// session and this endpoint can be retired or kept for analytics.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { body = {} }
  const email = String(body.email ?? '').trim().slice(0, 200)

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  // Attach the user id if the caller is signed in (optional).
  let userId: string | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch { /* anonymous is fine */ }

  const { error } = await supabaseAdmin
    .from('pro_interest')
    .insert({ email, user_id: userId })

  if (error) {
    return NextResponse.json({ error: 'Could not register interest.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
