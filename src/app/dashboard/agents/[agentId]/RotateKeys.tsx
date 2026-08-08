'use client'
// app/dashboard/agents/[agentId]/RotateKeys.tsx
// A self-contained "rotate credentials" panel for the agent detail page.
// Generates a fresh API key + AES key + signing secret via /api/agents/rotate,
// invalidating the old set, and shows the new three ONCE (Stripe-style).
//
// INTEGRATION (one line in the agent detail page):
//   import RotateKeys from './RotateKeys'
//   ...then place <RotateKeys agentPk={agent.id} /> near the API-key card.
import { useState } from 'react'
import { RefreshCw, AlertTriangle, Copy, Check, KeyRound } from 'lucide-react'

interface Creds {
  // Not a secret, but shown with them: all four are needed to make a request,
  // and the three secrets disappear from this screen once it is dismissed.
  agent_id: string
  api_key: string
  aes_key: string
  signing_secret: string
}

export default function RotateKeys({ agentPk }: { agentPk: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creds, setCreds] = useState<Creds | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [copied, setCopied] = useState('')

  async function rotate() {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/agents/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_pk: agentPk }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not rotate keys.'); setLoading(false); return }
      setCreds(data.credentials)
      setConfirming(false)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  async function copy(label: string, value: string) {
    // Same containment as the create-agent page, for the same reason: rotated
    // credentials are shown once and the old ones are already dead. An
    // unwrapped clipboard rejection unmounts this component mid-display and
    // takes the only copy of the new secrets with it.
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label); setTimeout(() => setCopied(''), 1500)
    } catch {
      setCopyFailed(true)
    }
  }

  if (creds) {
    const rows: { label: string; key: keyof Creds }[] = [
      { label: 'Agent ID', key: 'agent_id' },
      { label: 'API Key', key: 'api_key' },
      { label: 'AES Key', key: 'aes_key' },
      { label: 'Signing Secret', key: 'signing_secret' },
    ]
    return (
      <div className="card p-5 mt-4" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-white">New credentials — save all four now</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-400/08 border border-amber-400/25 rounded-lg p-3 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>The old credentials no longer work. These new secrets are shown once.</span>
        </div>
        {/* Shown when the clipboard refused. Without it, a user presses Copy,
            nothing lands, and they navigate away believing they hold secrets
            they do not — with the old ones already invalidated. */}
        {copyFailed && (
          <div className="flex items-start gap-2 text-xs text-amber-200 rounded-lg p-3 mb-4"
               style={{ background: 'rgba(251,191,36,0.10)',
                        border: '1px solid rgba(251,191,36,0.35)' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Your browser blocked the copy button. Select each value below and
              copy it by hand before leaving — the old credentials are already
              dead, and these are shown once.
            </span>
          </div>
        )}

        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{r.label}</span>
                <button onClick={() => copy(r.label, creds[r.key])}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  {copied === r.label ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-300 bg-black/30 rounded p-2 break-all">
                {creds[r.key]}
              </code>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {!confirming ? (
        <button onClick={() => setConfirming(true)}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
          <RefreshCw size={12} /> Rotate keys
        </button>
      ) : (
        <div className="card p-4" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <p className="text-sm text-slate-300 mb-1">Rotate this agent's credentials?</p>
          <p className="text-xs text-slate-500 mb-3">
            This generates a new API key, AES key, and signing secret. The current
            ones stop working immediately. Update your SDK config afterwards.
          </p>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={rotate} disabled={loading}
                    className="btn-primary text-xs px-3 py-1.5">
              {loading ? 'Rotating…' : 'Yes, rotate'}
            </button>
            <button onClick={() => { setConfirming(false); setError('') }}
                    className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
