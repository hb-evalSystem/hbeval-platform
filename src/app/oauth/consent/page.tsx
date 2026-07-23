// app/oauth/consent/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// OAuth consent screen for remote MCP connections.
//
// WHY THIS LIVES ON THE WEBSITE AND NOT THE GATEWAY
// The user must be signed in to approve, and the session cookie belongs to
// this origin. Authenticating inside the Gateway would mean rebuilding the
// entire sign-in stack there, with a second source of truth for identity.
//
// HOW IDENTITY IS ACTUALLY PROVEN
// This page does not tell the Gateway who the user is. It sends the user's
// Supabase access token, and the Gateway verifies it independently. Sending a
// user id and expecting it to be trusted would let anyone mint an
// authorization code for any account — the single most dangerous shortcut
// available in this flow, and the reason it is worth the extra round trip.
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ShieldCheck, Loader2, AlertTriangle, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

// Scope descriptions in the user's terms. "hbeval:evaluate" means nothing to
// someone deciding whether to trust an assistant with their account; a
// consent screen that lists opaque identifiers is not really consent.
const SCOPE_LABELS: Record<string, string> = {
  'hbeval:read':
    'Read your reliability metrics, evaluation history and qualified memory',
  'hbeval:evaluate':
    'Run reliability evaluations against your agents',
}

function ConsentInner() {
  const params = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'ready' | 'signin' | 'working' | 'error'>('checking')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  const clientName = params.get('client_name') || 'An MCP client'
  const scopes = (params.get('scope') || '').split(' ').filter(Boolean)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data?.user) { setStatus('signin'); return }
        setEmail(data.user.email || '')
        setStatus('ready')
      } catch {
        setStatus('signin')
      }
    })()
  }, [])

  async function approve() {
    setStatus('working')
    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) { setStatus('signin'); return }

      const res = await fetch(`${GATEWAY_URL}/oauth/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_access_token: accessToken,
          client_id: params.get('client_id'),
          redirect_uri: params.get('redirect_uri'),
          code_challenge: params.get('code_challenge'),
          code_challenge_method: params.get('code_challenge_method') || 'S256',
          scope: params.get('scope') || '',
          state: params.get('state') || '',
          resource: params.get('resource') || '',
        }),
      })

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || `Gateway returned ${res.status}`)
      }

      const json = await res.json()
      if (!json.redirect_to) throw new Error('No redirect returned.')
      // Hand control back to the client that started the flow.
      window.location.href = json.redirect_to
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.')
      setStatus('error')
    }
  }

  function deny() {
    // Returning the user to their own dashboard rather than redirecting to
    // the client: a denial should not hand anything back to the requester.
    window.location.href = '/dashboard'
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-16">
        <Loader2 className="animate-spin" size={18} /> Checking your session…
      </div>
    )
  }

  if (status === 'signin') {
    const next = typeof window !== 'undefined'
      ? encodeURIComponent(window.location.pathname + window.location.search)
      : ''
    return (
      <div className="card p-8 max-w-lg">
        <ShieldCheck size={26} className="text-blue-400 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Sign in to continue</h1>
        <p className="text-sm text-slate-400 mb-6">
          {clientName} is requesting access to your HB-Eval account. Sign in to
          review what it is asking for.
        </p>
        <a href={`/login?next=${next}`} className="btn-primary text-sm inline-flex">
          Sign in
        </a>
      </div>
    )
  }

  return (
    <div className="card p-8 max-w-lg">
      <ShieldCheck size={26} className="text-blue-400 mb-4" />
      <h1 className="text-xl font-semibold text-white mb-1">
        Connect {clientName}?
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Signed in as <span className="text-slate-200">{email}</span>
      </p>

      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
        This will allow it to
      </p>
      <ul className="space-y-2 mb-6">
        {(scopes.length ? scopes : Object.keys(SCOPE_LABELS)).map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-slate-300">
            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            {SCOPE_LABELS[s] || s}
          </li>
        ))}
      </ul>

      <div className="rounded-lg p-3 mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Access can be revoked at any time from your dashboard. Paid features
          such as verified evaluation still follow your plan — connecting an
          assistant does not change what your account is entitled to.
        </p>
      </div>

      {status === 'error' && (
        <div className="flex items-start gap-2 mb-4 text-sm">
          <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={approve} disabled={status === 'working'}
                className="btn-primary text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
          {status === 'working'
            ? <><Loader2 size={14} className="animate-spin" /> Connecting…</>
            : <><Check size={14} /> Approve</>}
        </button>
        <button onClick={deny} disabled={status === 'working'}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <X size={14} /> Deny
        </button>
      </div>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {/* useSearchParams requires a Suspense boundary in the app router. */}
      <Suspense fallback={
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      }>
        <ConsentInner />
      </Suspense>
    </div>
  )
}
