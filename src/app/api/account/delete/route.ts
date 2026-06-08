// app/api/account/delete/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Secure account deletion with two modes:
//
//   mode = 'full'    → permanently delete the user and ALL their data.
//                      We delete the auth user; ON DELETE CASCADE then removes
//                      their agents, and the agents' cascade removes their
//                      evaluations and edm_memory. One clean call.
//
//   mode = 'donate'  → close the account but KEEP evaluation records,
//                      de-identified. Because evaluations CASCADE-delete with
//                      their agent, we must FIRST copy the evaluations into a
//                      separate `donated_evaluations` table (no link to the
//                      user), and ONLY THEN delete the user. Order matters —
//                      this is what prevents foreign-key breakage.
//
// SECURITY:
//   • Auth required; the user id comes from the session, never the body.
//   • Uses service_role (admin) because deleting an auth user and writing the
//     donated table are privileged operations the browser cannot do.
//   • A user can only ever delete THEMSELVES — we operate solely on the
//     authenticated user's id.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // 2. Parse mode
  let body: any
  try { body = await req.json() } catch { body = {} }
  const mode = body.mode === 'donate' ? 'donate' : body.mode === 'full' ? 'full' : null
  if (!mode) {
    return NextResponse.json({ error: 'Invalid deletion mode.' }, { status: 400 })
  }

  // 3. If donating: copy this user's evaluations into donated_evaluations,
  //    de-identified, BEFORE any cascade can remove them.
  if (mode === 'donate') {
    // Find this user's agent ids.
    const { data: agents, error: agErr } = await supabaseAdmin
      .from('agents').select('id').eq('user_id', user.id)
    if (agErr) {
      return NextResponse.json({ error: 'Could not read account data.' }, { status: 500 })
    }
    const agentIds = (agents || []).map(a => a.id)

    if (agentIds.length > 0) {
      // Pull the evaluation records to donate. We copy only the scientific
      // fields — metrics and verdict — and DROP every identifying field
      // (no user id, no agent id, no api keys). A fresh random id is assigned.
      const { data: evals, error: evErr } = await supabaseAdmin
        .from('evaluations')
        .select('verdict, pei_score, irs_score, frr_score, ti_score, csi_score, created_at')
        .in('project_id', agentIds)
      if (evErr) {
        return NextResponse.json({ error: 'Could not read evaluations.' }, { status: 500 })
      }

      if (evals && evals.length > 0) {
        const donated = evals.map(e => ({
          verdict: e.verdict,
          pei_score: e.pei_score, irs_score: e.irs_score, frr_score: e.frr_score,
          ti_score: e.ti_score, csi_score: e.csi_score,
          original_created_at: e.created_at,
          // intentionally NO user_id, NO agent reference — fully de-identified
        }))
        const { error: insErr } = await supabaseAdmin
          .from('donated_evaluations').insert(donated)
        if (insErr) {
          // If the donate table is missing or the copy fails, abort WITHOUT
          // deleting anything — we must never delete data we promised to keep.
          return NextResponse.json(
            { error: 'Could not preserve donated data; account was NOT deleted.' },
            { status: 500 },
          )
        }
      }
    }
  }

  // 4. Delete the auth user. CASCADE removes agents → evaluations → edm_memory.
  //    (For 'donate', the donated copies already live in donated_evaluations,
  //    unlinked, so they survive.)
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (delErr) {
    return NextResponse.json({ error: 'Could not delete the account. Please try again.' }, { status: 500 })
  }

  // 5. Best-effort sign-out of the current session.
  try { await supabase.auth.signOut() } catch { /* session is gone anyway */ }

  return NextResponse.json({ ok: true, mode }, { status: 200 })
}
