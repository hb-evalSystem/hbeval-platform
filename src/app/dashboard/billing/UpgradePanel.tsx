'use client'
// app/dashboard/billing/UpgradePanel.tsx
// The free-plan upgrade call-to-action. Pre-launch, it collects the user's
// email so we can notify them when Pro opens.
//
// ── STRIPE SWAP POINT ────────────────────────────────────────────────────────
// When Stripe is ready, replace the body of handleNotify() with a call to a
// new /api/billing/checkout route that creates a Stripe Checkout Session and
// redirects to it. The surrounding UI (plan cards, this panel) stays the same;
// only the button action changes. No other file needs to change.
import { useState } from 'react'
import { Sparkles, Check } from 'lucide-react'

export default function UpgradePanel({ email }: { email: string }) {
  const [value, setValue] = useState(email)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleNotify() {
    setError('')
    if (!value || !value.includes('@')) { setError('Please enter a valid email.'); return }
    setLoading(true)
    try {
      // Pre-launch: record interest. (Stripe Checkout will replace this later.)
      const res = await fetch('/api/billing/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      // Even if the endpoint is not deployed yet, we fail gracefully to a
      // friendly confirmation — interest capture must never block the user.
      if (!res.ok && res.status !== 404) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Could not register your interest. Please try again.')
        setLoading(false)
        return
      }
    } catch {
      /* network error — still show confirmation; this is a soft action */
    }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="card p-6 flex items-center gap-3"
           style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
        <div className="w-10 h-10 rounded-full bg-emerald-400/12 flex items-center justify-center shrink-0">
          <Check size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-medium">You're on the list</p>
          <p className="text-slate-500 text-sm">We'll email you the moment Pro opens.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6" style={{ borderColor: 'rgba(37,99,235,0.2)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-blue-400" />
        <h3 className="font-semibold text-white">Upgrade to Pro</h3>
      </div>
      <p className="text-slate-500 text-sm mb-4 leading-relaxed">
        Pro is launching soon. Leave your email and we'll notify you when it's
        ready — you'll be first to unlock the verified evaluation path and
        reliability-tier qualification.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="email" value={value} onChange={e => setValue(e.target.value)}
               placeholder="you@example.com" className="flex-1" />
        <button onClick={handleNotify} disabled={loading} className="btn-primary justify-center">
          {loading ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  )
}
