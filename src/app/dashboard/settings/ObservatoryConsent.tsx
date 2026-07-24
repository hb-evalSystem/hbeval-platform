'use client'
// src/app/dashboard/settings/ObservatoryConsent.tsx
//
// Lets an account opt in to the public Observatory.
//
// WHY THIS WRITES DIRECTLY TO SUPABASE RATHER THAN THE GATEWAY
// The Gateway's consent endpoint authenticates with an agent's API key, AES
// key and signing secret — none of which may ever reach a browser. Here the
// user is already authenticated by their session, and observatory_consent
// carries an RLS policy scoping every row to auth.uid(). The database is
// therefore the correct authority for this particular write: no secret has to
// travel, and a user cannot alter anyone else's preference.
import { useEffect, useState } from 'react'
import { Telescope, Loader2, Check, AlertTriangle, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ObservatoryConsent({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('observatory_consent')
          .select('enabled')
          .eq('user_id', userId)
          .maybeSingle()
        if (err) throw err
        // No row means never opted in. Absence is the safe default, so this
        // needs no migration and no backfill.
        setEnabled(Boolean(data?.enabled))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your preference.')
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  async function toggle() {
    const next = !enabled
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('observatory_consent')
        .upsert(
          { user_id: userId, enabled: next, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      if (err) throw err
      setEnabled(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your preference.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
            <Telescope size={15} className="text-blue-400" />
            Contribute to the Observatory
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            The Observatory publishes aggregate reliability statistics across
            deployments, so the field can see what operational reliability looks
            like in practice rather than only in controlled studies. Turning this
            on adds your completed monitoring sessions to that aggregate.
          </p>
        </div>

        <button
          onClick={toggle}
          disabled={loading || saving}
          role="switch"
          aria-checked={enabled}
          aria-label="Contribute to the Observatory"
          className="relative shrink-0 rounded-full transition-colors disabled:opacity-50"
          style={{
            width: 44, height: 24,
            background: enabled ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.10)',
            border: `1px solid ${enabled ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`,
          }}
        >
          <span
            className="absolute top-[2px] rounded-full transition-all"
            style={{
              width: 18, height: 18,
              left: enabled ? 23 : 3,
              background: enabled ? '#34d399' : '#94a3b8',
            }}
          />
        </button>
      </div>

      {/* Stating precisely what leaves the account is the basis of informed
          consent. A toggle labelled only "share data" is not a decision anyone
          can actually make. */}
      <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-[11px] text-slate-500 mb-2">What is shared, per completed session:</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          <div>
            <p className="text-emerald-400/90 mb-1">Sent</p>
            <ul className="text-slate-400 space-y-0.5">
              <li>The five metric values</li>
              <li>Step count, as a range</li>
              <li>Which metrics breached</li>
              <li>Whether the run halted</li>
            </ul>
          </div>
          <div>
            <p className="text-red-400/80 mb-1">Never sent</p>
            <ul className="text-slate-400 space-y-0.5">
              <li>Agent or account identifiers</li>
              <li>Session metadata</li>
              <li>Step labels or prompts</li>
              <li>Exact timestamps</li>
            </ul>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 mt-3">
          Identifiers are dropped before a contribution is written, so they are
          absent from the public table rather than hidden from the public page.
          Figures are withheld entirely until at least five independent accounts
          have contributed, so no statistic can be traced to one deployment.
        </p>
      </div>

      <div className="flex items-center gap-3 mt-3">
        {loading && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" /> Loading…
          </span>
        )}
        {saved && (
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <Check size={11} /> Saved
          </span>
        )}
        {error && (
          <span className="text-[11px] text-red-300 flex items-center gap-1">
            <AlertTriangle size={11} /> {error}
          </span>
        )}
        <a href="/observatory" target="_blank" rel="noopener"
           className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto">
          View the Observatory <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}
