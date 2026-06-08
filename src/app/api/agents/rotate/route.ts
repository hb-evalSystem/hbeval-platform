// app/api/agents/rotate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rotate an agent's credentials: generate a fresh API key, AES key, and signing
// secret, replacing the old ones. The old credentials stop working immediately
// (the api_key changes and the encrypted secrets are overwritten).
//
// SECURITY:
//   • Auth required; user id from the session.
//   • OWNERSHIP CHECK: we update only WHERE id = agentId AND user_id = session
//     user — a user can never rotate someone else's agent.
//   • Uses service_role to write the encrypted columns (RLS forbids browser).
//   • New plaintext secrets returned ONCE, same Stripe-style one-time reveal.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateAgentSecrets } from '@/lib/crypto/secrets'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { body = {} }
  const agentId = String(body.agent_pk ?? '').trim()    // the agents.id (UUID)
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agent id.' }, { status: 400 })
  }

  // Ownership check: the agent must exist AND belong to this user.
  const { data: existing, error: findErr } = await supabaseAdmin
    .from('agents').select('id, user_id').eq('id', agentId).single()
  if (findErr || !existing) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }
  if (existing.user_id !== user.id) {
    // Do not reveal whether the agent exists for someone else.
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  // Generate a fresh credential set.
  const secrets = generateAgentSecrets()

  const { error: updErr } = await supabaseAdmin
    .from('agents')
    .update({
      api_key: secrets.apiKey,
      aes_key_encrypted: secrets.aesKeyEncrypted,
      hmac_secret_encrypted: secrets.hmacSecretEncrypted,
    })
    .eq('id', agentId)
    .eq('user_id', user.id)        // belt-and-braces: ownership in the WHERE too

  if (updErr) {
    return NextResponse.json({ error: 'Could not rotate keys. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    credentials: {
      api_key: secrets.apiKey,
      aes_key: secrets.aesKeyB64,
      signing_secret: secrets.signingSecretB64,
    },
  }, { status: 200 })
}
