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

interface Creds { api_key: string; aes_key: string; signing_secret: string }

export default function RotateKeys({ agentPk }: { agentPk: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creds, setCreds] = useState<Creds | null>(null)
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

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopied(label); setTimeout(() => setCopied(''), 1500)
  }

  if (creds) {
    const rows: { label: string; key: keyof Creds }[] = [
      { label: 'API Key', key: 'api_key' },
      { label: 'AES Key', key: 'aes_key' },
      { label: 'Signing Secret', key: 'signing_secret' },
    ]
    return (
      <div className="card p-5 mt-4" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-white">New credentials — save them now</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-400/08 border border-amber-400/25 rounded-lg p-3 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>The old credentials no longer work. These new secrets are shown once.</span>
        </div>
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
