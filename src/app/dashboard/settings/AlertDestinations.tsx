'use client'
// src/app/dashboard/settings/AlertDestinations.tsx
//
// Manage where reliability alerts are sent.
//
// WHY THIS WRITES DIRECTLY TO SUPABASE
// The webhooks table carries an RLS policy scoping every row to auth.uid(),
// and this is configuration the owner should be able to edit. No agent
// credential is involved, so nothing secret has to travel to reach the
// database — the same reasoning as the Observatory consent toggle.
//
// WEBHOOK URLS ARE CREDENTIALS
// A Slack incoming-webhook URL lets anyone holding it post as that integration.
// So a saved URL is never displayed again: the list shows the host and a
// fingerprint, and changing one means replacing it. Showing it back would put a
// live credential on screen every time someone opens their settings.
import { useCallback, useEffect, useState } from 'react'
import {
  BellRing, Plus, Trash2, Check, AlertTriangle, Loader2, Power,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Webhook {
  id: string
  label: string | null
  destination: string
  url: string
  is_active: boolean
  event_filter: string[]
  metric_filter: string[]
  consecutive_failures: number
  last_error: string | null
  last_status: number | null
  last_fired_at: string | null
  total_delivered: number
  auto_disabled_at: string | null
}

const DESTINATIONS = [
  { id: 'slack', label: 'Slack', hint: 'Incoming webhook URL' },
  { id: 'pagerduty', label: 'PagerDuty', hint: 'Events v2 URL, then #routing_key' },
  { id: 'generic', label: 'Webhook', hint: 'Any HTTPS endpoint — receives JSON' },
]

const METRICS = ['pei', 'frr', 'irs', 'ti', 'csi']

// Mirrors the Gateway's ssrf_guard policy so an obviously-invalid URL is
// rejected here rather than after a round trip. The server check remains
// authoritative — this is a courtesy, not a control.
function urlProblem(url: string): string | null {
  const u = url.split('#')[0].trim()
  if (!u) return 'Enter a URL.'
  if (!u.startsWith('https://')) return 'Must be https:// — plain HTTP is refused.'
  try {
    const parsed = new URL(u)
    if (parsed.port && parsed.port !== '443') return 'Only port 443 is allowed.'
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(parsed.hostname)) {
      return 'Private and loopback addresses are refused.'
    }
  } catch {
    return 'That does not parse as a URL.'
  }
  return null
}

function fingerprint(url: string): string {
  try {
    const u = new URL(url.split('#')[0])
    const tail = u.pathname.replace(/\/+$/, '').slice(-6)
    return `${u.hostname}/…${tail}`
  } catch {
    return 'invalid URL'
  }
}

export default function AlertDestinations({ userId }: { userId: string }) {
  const [hooks, setHooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const [destination, setDestination] = useState('slack')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [metrics, setMetrics] = useState<string[]>([])
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('webhooks')
        .select('id, label, destination, url, is_active, event_filter, metric_filter, consecutive_failures, last_error, last_status, last_fired_at, total_delivered, auto_disabled_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      setHooks((data ?? []) as Webhook[])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load alert destinations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    const problem = urlProblem(url)
    if (problem) { setFormError(problem); return }
    setSaving(true)
    setFormError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('webhooks').insert({
        user_id: userId,
        destination,
        url: url.trim(),
        label: label.trim() || null,
        metric_filter: metrics,
        event_filter: [],       // empty means every event type
        is_active: true,
      })
      if (err) throw err
      setUrl(''); setLabel(''); setMetrics([]); setAdding(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(h: Webhook) {
    const supabase = createClient()
    // Re-enabling clears the failure count, otherwise a destination that was
    // auto-disabled would switch itself off again on the very next failure.
    await supabase.from('webhooks').update({
      is_active: !h.is_active,
      ...(h.is_active ? {} : { consecutive_failures: 0, auto_disabled_at: null, last_error: null }),
    }).eq('id', h.id)
    await load()
  }

  async function remove(id: string) {
    const supabase = createClient()
    await supabase.from('webhooks').delete().eq('id', id)
    await load()
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
            <BellRing size={15} className="text-amber-400" />
            Alert destinations
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Where to send a notification when a metric crosses below its floor,
            or when Safe Halt stops a run. One alert per metric per session —
            a metric that stays below for twenty steps notifies once, not twenty
            times.
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
                  className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {loading && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> Loading…
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-300 flex items-center gap-1 mb-3">
          <AlertTriangle size={11} /> {error}
        </p>
      )}

      {/* Existing destinations */}
      {!loading && hooks.length > 0 && (
        <div className="space-y-2 mb-4">
          {hooks.map(h => (
            <div key={h.id} className="rounded-lg p-3"
                 style={{
                   background: 'rgba(255,255,255,0.03)',
                   borderLeft: `2px solid ${h.is_active ? '#34d399' : '#64748b'}`,
                 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white">
                      {h.label || DESTINATIONS.find(d => d.id === h.destination)?.label || h.destination}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                      {h.destination}
                    </span>
                    {!h.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8' }}>
                        {h.auto_disabled_at ? 'auto-disabled' : 'off'}
                      </span>
                    )}
                  </div>
                  {/* Host and a fragment of the path — never the whole URL. */}
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {fingerprint(h.url)}
                  </p>
                  {h.metric_filter.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Only {h.metric_filter.map(m => m.toUpperCase()).join(', ')}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600 mt-1">
                    {h.total_delivered} delivered
                    {h.last_fired_at && ` · last ${new Date(h.last_fired_at).toLocaleDateString()}`}
                  </p>
                  {/* A failing destination is stated, not hidden. Alerts that
                      silently stop arriving are worse than none, because the
                      silence reads as "nothing is wrong". */}
                  {h.consecutive_failures > 0 && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      {h.consecutive_failures} consecutive failure
                      {h.consecutive_failures > 1 ? 's' : ''}
                      {h.last_error && ` — ${h.last_error.slice(0, 80)}`}
                    </p>
                  )}
                  {h.auto_disabled_at && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Disabled automatically after repeated failures. Fix the
                      endpoint, then switch it back on.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggle(h)} title={h.is_active ? 'Disable' : 'Enable'}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-200 transition-colors">
                    <Power size={13} />
                  </button>
                  <button onClick={() => remove(h.id)} title="Delete"
                          className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hooks.length === 0 && !adding && (
        <p className="text-xs text-slate-500 mb-2">
          No destinations yet. Without one, a collapse is recorded and shown on
          the dashboard, but nobody is told.
        </p>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex gap-2 flex-wrap">
            {DESTINATIONS.map(d => (
              <button key={d.id} onClick={() => setDestination(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{
                        background: destination === d.id ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${destination === d.id ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: destination === d.id ? '#bfdbfe' : '#cbd5e1',
                      }}>
                {d.label}
              </button>
            ))}
          </div>

          <div>
            <input value={url} onChange={e => { setUrl(e.target.value); setFormError('') }}
                   placeholder="https://…"
                   className="w-full text-sm rounded-lg px-3 py-2"
                   style={{ background: 'rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
            <p className="text-[11px] text-slate-500 mt-1">
              {DESTINATIONS.find(d => d.id === destination)?.hint}
              {' · '}Stored write-only — it is not shown again after saving.
            </p>
          </div>

          <input value={label} onChange={e => setLabel(e.target.value)}
                 placeholder="Label (optional) — e.g. #eng-alerts"
                 className="w-full text-sm rounded-lg px-3 py-2"
                 style={{ background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />

          <div>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Only alert on these metrics (none selected = all)
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {METRICS.map(m => {
                const on = metrics.includes(m)
                return (
                  <button key={m}
                          onClick={() => setMetrics(s => on ? s.filter(x => x !== m) : [...s, m])}
                          className="px-2 py-1 rounded text-[11px] transition-colors"
                          style={{
                            background: on ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${on ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                            color: on ? '#6ee7b7' : '#94a3b8',
                          }}>
                    {m.toUpperCase()}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              A halt is always sent regardless of this filter — it is an action
              already taken, not a warning.
            </p>
          </div>

          {formError && (
            <p className="text-[11px] text-red-300 flex items-center gap-1">
              <AlertTriangle size={11} /> {formError}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button onClick={add} disabled={saving}
                    className="btn-primary text-xs px-4 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
            <button onClick={() => { setAdding(false); setFormError(''); setUrl('') }}
                    className="text-xs px-3 py-1.5 rounded-lg text-slate-300"
                    style={{ background: 'rgba(255,255,255,0.04)',
                             border: '1px solid rgba(255,255,255,0.08)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
