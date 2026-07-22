'use client'
// app/dashboard/monitoring/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Live runtime-monitoring dashboard.
//
// DATA PATH — and why it is safe:
//   The SDK's monitor() context manager sends each closed session to the
//   Gateway, which stores it in monitoring_sessions / monitoring_events. This
//   page reads those rows DIRECTLY from Supabase using the browser client and
//   the signed-in user's session. It never touches the Gateway, and therefore
//   never needs the agent's API key, AES key, or signing secret — none of
//   which may ever reach a browser.
//
//   Isolation is enforced by row level security on both tables
//   (auth.uid() = user_id, migration 09). There is deliberately no manual
//   user_id filter in the queries below: adding one would imply RLS is
//   optional, and would silently mask a policy regression instead of failing
//   loudly. RLS is the boundary; this page relies on it.
//
// UNDEFINED vs ZERO:
//   A metric may be legitimately undefined — IRS when no fault was injected,
//   CSI within a single session. Those arrive as null and are rendered as "—".
//   They are never coerced to 0, which would read as a failing score on a
//   dimension that was never measured.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Loader2, RefreshCw, ShieldAlert, Terminal, Copy, Check, Radio,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────
interface MonitoringSession {
  session_id: string
  agent_id: string
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  step_count: number
  breach_count: number
  halted: boolean
  pei_live: number | null
  frr_live: number | null
  irs_live: number | null
  ti_live: number | null
  csi_live: number | null
  created_at: string
}

interface BreachEvent {
  id: string
  session_id: string
  metric: string
  value: number
  threshold: number
  step_index: number
  occurred_at: string
}

type MetricKey = 'pei' | 'frr' | 'irs' | 'ti' | 'csi'
type Direction = 'improving' | 'declining' | 'stable' | 'undefined'

const METRICS: { key: MetricKey; column: keyof MonitoringSession; label: string; full: string; max: number }[] = [
  { key: 'pei', column: 'pei_live', label: 'PEI', full: 'Planning Efficiency', max: 1 },
  { key: 'frr', column: 'frr_live', label: 'FRR', full: 'Failure Resilience', max: 1 },
  { key: 'irs', column: 'irs_live', label: 'IRS', full: 'Intentional Recovery', max: 1 },
  { key: 'ti',  column: 'ti_live',  label: 'TI',  full: 'Traceability', max: 5 },
  { key: 'csi', column: 'csi_live', label: 'CSI', full: 'Consistency Stability', max: 1 },
]

const POLL_MS = 20_000
const SESSION_LIMIT = 100

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(value: number | null | undefined, digits = 2): string {
  // "—" for undefined. See the UNDEFINED vs ZERO note at the top of the file.
  return value === null || value === undefined ? '—' : value.toFixed(digits)
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// Direction over a series. Mirrors the rule used by the Gateway's
// /api/v1/monitoring/trend endpoint: compare the first half of the window with
// the second, and report a direction ONLY where the metric is defined in both
// halves. An undefined metric yields 'undefined' rather than a fabricated trend.
function directionOf(values: (number | null)[]): Direction {
  const half = Math.max(1, Math.floor(values.length / 2))
  const avg = (arr: (number | null)[]) => {
    const v = arr.filter((x): x is number => x !== null && x !== undefined)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const early = avg(values.slice(0, half))
  const late = avg(values.slice(half))
  if (early === null || late === null) return 'undefined'
  const delta = late - early
  if (delta > 0.01) return 'improving'
  if (delta < -0.01) return 'declining'
  return 'stable'
}

// Dependency-free sparkline. Nulls break the line rather than being drawn as
// zero, so a gap is visibly a gap.
function Sparkline({ values, max, color }: { values: (number | null)[]; max: number; color: string }) {
  const W = 200, H = 40, PAD = 3
  if (values.length < 2) {
    return <div className="h-[40px] flex items-center text-[11px] text-slate-600">Not enough sessions yet</div>
  }
  const step = (W - PAD * 2) / (values.length - 1)
  const segments: string[] = []
  let current: string[] = []
  values.forEach((v, i) => {
    if (v === null || v === undefined) {
      if (current.length > 1) segments.push(current.join(' '))
      current = []
      return
    }
    const x = PAD + i * step
    const y = H - PAD - (Math.min(v, max) / max) * (H - PAD * 2)
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  })
  if (current.length > 1) segments.push(current.join(' '))

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {segments.map((pts, i) => (
        <polyline key={i} points={pts} fill="none" stroke={color} strokeWidth="1.75"
                  strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      ))}
    </svg>
  )
}

function DirectionBadge({ direction }: { direction: Direction }) {
  const map: Record<Direction, { icon: React.ReactNode; text: string; color: string }> = {
    improving: { icon: <ArrowUpRight size={12} />, text: 'improving', color: '#34d399' },
    declining: { icon: <ArrowDownRight size={12} />, text: 'declining', color: '#f87171' },
    stable:    { icon: <Minus size={12} />, text: 'stable', color: '#94a3b8' },
    undefined: { icon: <Minus size={12} />, text: 'undefined', color: '#64748b' },
  }
  const m = map[direction]
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: m.color }}>
      {m.icon}{m.text}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const [sessions, setSessions] = useState<MonitoringSession[]>([])
  const [events, setEvents] = useState<BreachEvent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const supabase = createClient()

      // RLS scopes both queries to the signed-in user. See the note at the top.
      const { data: sessionRows, error: sErr } = await supabase
        .from('monitoring_sessions')
        .select('session_id, agent_id, started_at, ended_at, duration_seconds, ' +
                'step_count, breach_count, halted, pei_live, frr_live, irs_live, ' +
                'ti_live, csi_live, created_at')
        .order('created_at', { ascending: false })
        .limit(SESSION_LIMIT)

      if (sErr) throw sErr
      const list = (sessionRows ?? []) as MonitoringSession[]
      setSessions(list)

      if (list.length > 0) {
        const ids = list.slice(0, 20).map((s) => s.session_id)
        const { data: eventRows, error: eErr } = await supabase
          .from('monitoring_events')
          .select('id, session_id, metric, value, threshold, step_index, occurred_at')
          .in('session_id', ids)
          .order('occurred_at', { ascending: false })
          .limit(50)
        if (eErr) throw eErr
        setEvents((eventRows ?? []) as BreachEvent[])
      } else {
        setEvents([])
      }

      setError('')
      setLastUpdated(new Date())
    } catch (err) {
      // Surface the failure rather than rendering an empty dashboard that looks
      // like "no data" when the real cause is a broken query or policy.
      setError(err instanceof Error ? err.message : 'Could not load monitoring data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => {
      // Skip polling while the tab is hidden — no point spending bandwidth on a
      // dashboard nobody is looking at.
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        load(true)
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [live, load])

  const agentIds = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.agent_id))).sort(),
    [sessions],
  )

  const filtered = useMemo(
    () => (selectedAgent === 'all' ? sessions : sessions.filter((s) => s.agent_id === selectedAgent)),
    [sessions, selectedAgent],
  )

  // Oldest-first for charts and direction.
  const series = useMemo(() => [...filtered].reverse(), [filtered])

  const stats = useMemo(() => ({
    sessionCount: filtered.length,
    totalSteps: filtered.reduce((a, s) => a + (s.step_count || 0), 0),
    totalBreaches: filtered.reduce((a, s) => a + (s.breach_count || 0), 0),
    haltedCount: filtered.filter((s) => s.halted).length,
  }), [filtered])

  const latest = filtered[0]

  const filteredEvents = useMemo(() => {
    if (selectedAgent === 'all') return events
    const ids = new Set(filtered.map((s) => s.session_id))
    return events.filter((e) => ids.has(e.session_id))
  }, [events, filtered, selectedAgent])

  const snippet = `from hb_eval_sdk import HBEvalClient

client = HBEvalClient(api_key=..., aes_key=..., signing_secret=...)

with client.monitor(agent_id="my-agent") as m:
    for step in agent.run(task):
        m.record_step(
            action=step.name,
            success=step.ok,
            had_fault=step.fault,
            traceable=step.has_reasoning,
        )
        if m.should_halt:
            break`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3">
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
              <Activity size={26} className="text-blue-400" />
              Runtime Monitoring
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Reliability signals recorded while your agents were running — not after the fact.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: live ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${live ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: live ? '#6ee7b7' : '#cbd5e1',
              }}
              aria-pressed={live}
            >
              <Radio size={12} className={live ? 'animate-pulse' : ''} />
              {live ? 'Live' : 'Paused'}
            </button>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="card p-4 mb-6 flex items-start gap-2.5"
               style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300">Could not load monitoring data</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state — the common case until someone runs monitor() */}
        {sessions.length === 0 && !error ? (
          <div className="card p-8">
            <h2 className="text-xl font-semibold text-white mb-2">No monitored runs yet</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-2xl">
              Batch evaluation judges a run once it is over. Monitoring watches an agent
              step by step <em className="not-italic text-slate-200">while it executes</em>,
              so a collapse in reliability is visible at the step it happens. Wrap your
              agent loop in <code className="text-blue-300">client.monitor(...)</code> and
              sessions will appear here.
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between px-4 py-2"
                   style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Terminal size={12} /> python
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(snippet)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1800)
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-[12px] leading-relaxed overflow-x-auto font-mono text-slate-300"
                   style={{ background: 'rgba(0,0,0,0.25)' }}>{snippet}</pre>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Requires hb-eval-sdk 2.3.0 or newer. Per-step signals are computed on your
              machine; only the closed session summary is sent here.
            </p>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Agent</span>
                <button
                  onClick={() => setSelectedAgent('all')}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: selectedAgent === 'all' ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedAgent === 'all' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: selectedAgent === 'all' ? '#bfdbfe' : '#cbd5e1',
                  }}
                >
                  All ({sessions.length})
                </button>
                {agentIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedAgent(id)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors max-w-[220px] truncate"
                    style={{
                      background: selectedAgent === id ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selectedAgent === id ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: selectedAgent === id ? '#bfdbfe' : '#cbd5e1',
                    }}
                    title={id}
                  >
                    {id}
                  </button>
                ))}
              </div>
              {lastUpdated && (
                <span className="text-[11px] text-slate-500">
                  Updated {timeAgo(lastUpdated.toISOString())}
                </span>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Sessions', value: stats.sessionCount, color: '#e2e8f0' },
                { label: 'Steps observed', value: stats.totalSteps, color: '#e2e8f0' },
                { label: 'Threshold breaches', value: stats.totalBreaches, color: stats.totalBreaches ? '#fbbf24' : '#e2e8f0' },
                { label: 'Halted runs', value: stats.haltedCount, color: stats.haltedCount ? '#f87171' : '#e2e8f0' },
              ].map((s) => (
                <div key={s.label} className="card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">{s.label}</p>
                  <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              Live signals {selectedAgent !== 'all' && <span className="text-slate-500">· {selectedAgent}</span>}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {METRICS.map((m) => {
                const values = series.map((s) => s[m.column] as number | null)
                const dir = directionOf(values)
                const current = latest ? (latest[m.column] as number | null) : null
                const defined = values.filter((v): v is number => v !== null)
                const avg = defined.length ? defined.reduce((a, b) => a + b, 0) / defined.length : null
                return (
                  <div key={m.key} className="card p-5">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="text-sm font-semibold text-white">{m.label}</span>
                        <p className="text-[11px] text-slate-500">{m.full}</p>
                      </div>
                      <DirectionBadge direction={dir} />
                    </div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-2xl font-semibold text-white">
                        {fmt(current, m.max === 5 ? 2 : 3)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        avg {fmt(avg, m.max === 5 ? 2 : 3)}
                      </span>
                    </div>
                    <Sparkline values={values} max={m.max} color="#60a5fa" />
                    {defined.length === 0 && (
                      <p className="text-[11px] text-slate-600 mt-1">
                        Undefined across these sessions — not scored as zero.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Breaches */}
            {filteredEvents.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-400" /> Recent threshold breaches
                </h2>
                <div className="card overflow-hidden mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wide text-slate-500"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <th className="text-left font-medium px-4 py-2.5">Metric</th>
                          <th className="text-left font-medium px-4 py-2.5">Value</th>
                          <th className="text-left font-medium px-4 py-2.5">Threshold</th>
                          <th className="text-left font-medium px-4 py-2.5">Step</th>
                          <th className="text-left font-medium px-4 py-2.5">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.slice(0, 20).map((e) => (
                          <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-4 py-2.5 font-medium text-amber-300 uppercase">{e.metric}</td>
                            <td className="px-4 py-2.5 text-slate-200">{fmt(e.value, 3)}</td>
                            <td className="px-4 py-2.5 text-slate-500">{fmt(e.threshold, 3)}</td>
                            <td className="px-4 py-2.5 text-slate-400">#{e.step_index}</td>
                            <td className="px-4 py-2.5 text-slate-500">{timeAgo(e.occurred_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Sessions */}
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Sessions</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th className="text-left font-medium px-4 py-2.5">Agent</th>
                      <th className="text-left font-medium px-4 py-2.5">Steps</th>
                      {METRICS.map((m) => (
                        <th key={m.key} className="text-left font-medium px-4 py-2.5">{m.label}</th>
                      ))}
                      <th className="text-left font-medium px-4 py-2.5">Breaches</th>
                      <th className="text-left font-medium px-4 py-2.5">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 25).map((s) => (
                      <tr key={s.session_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-2.5 text-slate-200 max-w-[180px] truncate" title={s.agent_id}>
                          {s.agent_id}
                          {s.halted && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                              halted
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{s.step_count}</td>
                        {METRICS.map((m) => (
                          <td key={m.key} className="px-4 py-2.5 text-slate-300">
                            {fmt(s[m.column] as number | null, m.max === 5 ? 2 : 3)}
                          </td>
                        ))}
                        <td className="px-4 py-2.5">
                          <span style={{ color: s.breach_count ? '#fbbf24' : '#64748b' }}>{s.breach_count}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{timeAgo(s.started_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 mt-4">
              Showing the most recent {SESSION_LIMIT} sessions. Values marked &ldquo;—&rdquo; were
              undefined for that run (for example IRS when no fault was injected), not zero.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
