'use client'
// app/dashboard/settings/DangerZone.tsx
// Account deletion with TWO explicit choices, presented clearly:
//
//   1. Full delete    — permanently removes the account AND all data
//                        (agents + evaluations). Requires typing the email to
//                        confirm, matching the pattern used by GitHub / Stripe.
//   2. Donate data     — deletes the account but anonymises and KEEPS the
//                        evaluation records (de-identified) to help improve the
//                        platform. The user chooses this freely.
//
// Both call POST /api/account/delete with { mode } — implemented in Batch 2.
// The endpoint holds service_role and performs the deletion in the correct
// order so no foreign-key breakage occurs. Until that endpoint exists this
// component degrades gracefully (shows a clear message on 404).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, HeartHandshake } from 'lucide-react'

export default function DangerZone({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'none' | 'full' | 'donate'>('none')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function performDeletion(selected: 'full' | 'donate') {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selected }),
      })
      if (res.status === 404) {
        setError('Account deletion is not available yet. Please contact support.')
        setLoading(false); return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Deletion failed. Please try again.'); setLoading(false); return }
      // Success: sign out happens server-side; send the user home.
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="card p-6" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
      <div className="flex items-start gap-3 mb-5">
        <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-medium mb-1">Delete your account</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Choose how you'd like to leave. This action cannot be undone.
          </p>
        </div>
      </div>

      {mode === 'none' && (
        <div className="space-y-3">
          {/* Option 1: full delete */}
          <button onClick={() => setMode('full')}
                  className="w-full text-left card p-4 hover:no-underline transition-colors"
                  style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-3">
              <Trash2 size={16} className="text-red-400 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Delete everything</div>
                <div className="text-xs text-slate-500">
                  Permanently remove my account and all my agents and evaluations.
                </div>
              </div>
            </div>
          </button>

          {/* Option 2: donate anonymised data */}
          <button onClick={() => setMode('donate')}
                  className="w-full text-left card p-4 hover:no-underline transition-colors"
                  style={{ borderColor: 'rgba(37,99,235,0.2)' }}>
            <div className="flex items-center gap-3">
              <HeartHandshake size={16} className="text-blue-400 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Delete account, donate anonymised data</div>
                <div className="text-xs text-slate-500">
                  Close my account but keep my evaluation records, de-identified,
                  to help improve the platform.
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Confirm full delete: type email */}
      {mode === 'full' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            This permanently deletes your account and <strong className="text-white">all data</strong>.
            Type your email <span className="font-mono text-white">{userEmail}</span> to confirm.
          </p>
          <input type="email" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                 placeholder={userEmail} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button disabled={confirmText !== userEmail || loading}
                    onClick={() => performDeletion('full')}
                    className="btn-primary justify-center"
                    style={{ background: 'var(--unsafe)', boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>
              {loading ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button onClick={() => { setMode('none'); setConfirmText(''); setError('') }}
                    className="btn-secondary justify-center">Cancel</button>
          </div>
        </div>
      )}

      {/* Confirm donate */}
      {mode === 'donate' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">
            Your account will be closed and you'll be signed out. Your evaluation
            records will be <strong className="text-white">de-identified</strong> —
            stripped of any link to you — and kept to help improve the platform.
            You can proceed below.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button disabled={loading} onClick={() => performDeletion('donate')}
                    className="btn-primary justify-center">
              {loading ? 'Processing…' : 'Close account & donate data'}
            </button>
            <button onClick={() => { setMode('none'); setError('') }}
                    className="btn-secondary justify-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
