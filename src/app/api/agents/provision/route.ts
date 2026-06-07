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

const MAX_AGENTS_PER_USER = 25
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

  // ── 3. Enforce per-user agent cap (anti-abuse) ──
  const { count, error: countErr } = await supabaseAdmin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (countErr) {
    return NextResponse.json({ error: 'Could not verify account state.' }, { status: 500 })
  }
  if ((count ?? 0) >= MAX_AGENTS_PER_USER) {
    return NextResponse.json(
      { error: `Agent limit reached (${MAX_AGENTS_PER_USER}). Delete an agent or contact support.` },
      { status: 409 },
    )
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
      evaluation_limit: 500,
      is_active: true,
    })
    .select('id, name, agent_id, api_key, plan_type, evaluation_limit')
    .single()

  if (insErr || !inserted) {
    // Unique-violation on agent_id or api_key, or any write error.
    const msg = insErr?.message?.includes('duplicate')
      ? 'That agent_id is already in use on your account. Choose another.'
      : 'Could not create the agent. Please try again.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // ── 7. Return plaintext secrets ONCE. They are not stored in plaintext and
  //       cannot be retrieved again — the client must surface them now. ──
  return NextResponse.json({
    agent: inserted,
    // shown once, Stripe-style:
    credentials: {
      api_key: secrets.apiKey,
      aes_key: secrets.aesKeyB64,
      signing_secret: secrets.signingSecretB64,
    },
  }, { status: 201 })
}
