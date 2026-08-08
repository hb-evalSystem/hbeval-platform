// app/api/agents/provision/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE single server-side endpoint that creates an agent with all three
// credentials. This is the ONLY place an agent row is ever created.
//
// Why a server endpoint (not the browser):
//   • Generating/encrypting secrets needs the master key, which must never
//     reach the browser.
//   • Writing the encrypted columns needs service_role, which bypasses RLS and
//     must never reach the browser.
//
// Security properties enforced here:
//   1. AUTH: the caller must have a valid Supabase session (cookie). We resolve
//      their user id server-side; the browser cannot spoof it.
//   2. OWNERSHIP: the new agent's user_id is taken from the authenticated
//      session, never from the request body.
//   3. INPUT LIMITS: name/description/agent_id are length-capped and sanitised.
//   4. PER-USER AGENT CAP: prevents abuse (a user spamming thousands of agents).
//   5. SECRETS SHOWN ONCE: plaintext aes/signing are returned in this response
//      only; only the encrypted forms are persisted.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateAgentSecrets } from '@/lib/crypto/secrets'

export const runtime = 'nodejs'        // crypto module needs the Node runtime, not edge

// Free accounts may create up to 2 agents; paid (Pro) up to 10. These are
// account-level caps. The monthly EVALUATION limit is separate and lives on
// the account (account_usage), shared across all of an account's agents.
const FREE_AGENT_CAP = 2
const PAID_AGENT_CAP = 10
const AGENT_ID_RE = /^[a-zA-Z0-9\-_]+$/

export async function POST(req: NextRequest) {
  // ── 1. Authenticate via the session cookie (server-side, unforgeable) ──
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // ── 2. Parse and validate input ──
  let body: any
  try { body = await req.json() } catch { body = {} }

  const name = String(body.name ?? '').trim().slice(0, 80) || 'My First Agent'
  const description = String(body.description ?? '').trim().slice(0, 300)
  let agentId = String(body.agent_id ?? '').trim().slice(0, 64)

  if (agentId && !AGENT_ID_RE.test(agentId)) {
    return NextResponse.json(
      { error: 'agent_id may contain only letters, numbers, hyphens and underscores.' },
      { status: 400 },
    )
  }

  // ── 3. Enforce per-plan agent cap (anti-abuse + free-tier limit) ──
  // Determine the account plan from any existing agent (defaults to free).
  const { data: planRow } = await supabaseAdmin
    .from('agents').select('plan_type').eq('user_id', user.id).limit(1).maybeSingle()
  const plan = planRow?.plan_type || 'free'
  const cap = plan === 'free' ? FREE_AGENT_CAP : PAID_AGENT_CAP

  const { count, error: countErr } = await supabaseAdmin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (countErr) {
    return NextResponse.json({ error: 'Could not verify account state.' }, { status: 500 })
  }
  if ((count ?? 0) >= cap) {
    const msg = plan === 'free'
      ? `Free accounts are limited to ${FREE_AGENT_CAP} agents. Upgrade to Pro for more.`
      : `Agent limit reached (${cap}). Contact support.`
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  // ── 4. Default agent_id if not provided ──
  if (!agentId) {
    agentId = 'agent-' + Math.random().toString(36).slice(2, 10)
  }

  // ── 5. Generate the three credentials (plaintext + encrypted forms) ──
  const secrets = generateAgentSecrets()

  // ── 6. Insert with service_role. user_id comes from the SESSION, not body. ──
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('agents')
    .insert({
      user_id: user.id,
      name,
      description,
      agent_id: agentId,
      api_key: secrets.apiKey,
      aes_key_encrypted: secrets.aesKeyEncrypted,
      hmac_secret_encrypted: secrets.hmacSecretEncrypted,
      plan_type: 'free',
      is_active: true,
    })
    .select('id, name, agent_id, api_key, plan_type')
    .single()

  if (insErr || !inserted) {
    // The database error is logged in full and a short code is returned.
    //
    // Previously this collapsed every failure into "Please try again", which
    // told the user nothing and told the operator nothing either — the cause
    // was discarded at the moment it was known. A missing column, a failed
    // constraint and a duplicate id all looked identical, and diagnosing one
    // meant guessing.
    //
    // The message stays generic because it is public and a database error can
    // name schemas and columns. The code is what makes the log searchable.
    console.error('[provision] insert failed', {
      code: insErr?.code,
      message: insErr?.message,
      details: insErr?.details,
      hint: insErr?.hint,
      user: user.id,
    })

    if (insErr?.message?.includes('duplicate')
        || insErr?.code === '23505') {
      return NextResponse.json(
        { error: 'That agent_id is already in use on your account. Choose another.' },
        { status: 400 },
      )
    }

    // Postgres error classes worth distinguishing, because each has a
    // different fix and a user who sees "try again" will simply try again.
    const CODE_HELP: Record<string, string> = {
      // undefined_column — the schema is behind the code
      '42703': 'The database schema is out of date for this deployment.',
      // not_null_violation — a required column has no default
      '23502': 'The database is missing a required default.',
      // foreign_key_violation — a referenced row does not exist
      '23503': 'A referenced record is missing.',
      // insufficient_privilege
      '42501': 'The server lacks permission to write this record.',
    }
    const detail = insErr?.code ? CODE_HELP[insErr.code] : undefined

    return NextResponse.json(
      {
        error: detail
          ? `${detail} Please report code ${insErr?.code}.`
          : 'Could not create the agent. Please try again, and report code '
            + `${insErr?.code ?? 'unknown'} if it persists.`,
        code: insErr?.code ?? 'unknown',
      },
      { status: 400 },
    )
  }

  // ── 7. Return plaintext secrets ONCE. They are not stored in plaintext and
  //       cannot be retrieved again — the client must surface them now. ──
  return NextResponse.json({
    agent: inserted,
    // shown once, Stripe-style:
    credentials: {
      // Not a secret, but returned with them: all four values are needed to
      // make a request, and the three secrets disappear once this screen is
      // dismissed. Sending three and leaving the fourth to be found elsewhere
      // is how somebody ends up with an incomplete .env and no way to tell
      // which value is wrong.
      agent_id: inserted.agent_id,
      api_key: secrets.apiKey,
      aes_key: secrets.aesKeyB64,
      signing_secret: secrets.signingSecretB64,
    },
  }, { status: 201 })
}
