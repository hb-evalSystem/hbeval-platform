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

// Per-IP rate limit. This endpoint is unauthenticated by design (the point is
// to capture interest before signup), which also makes it the easiest table in
// the system to flood. In-memory rather than Redis because the consequence of
// losing the counter on a cold start is a few extra rows, not a breach — and
// adding a Redis dependency to a pre-launch interest form is not proportionate.
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  // Bound the map so a spray of distinct IPs cannot grow it without limit.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= RATE_WINDOW_MS)) hits.delete(k)
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
          || req.headers.get('x-real-ip')
          || 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 },
    )
  }

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
