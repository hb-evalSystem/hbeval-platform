'use client'
// src/app/dashboard/monitoring/[sessionId]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One session, four views over the same data.
//
// WHY ONE PAGE AND NOT FOUR
// Timeline, Replay, Compare and Audit read the same three tables. Replay IS the
// timeline with a playhead; Compare is two timelines aligned; Audit is the halt
// decision that the timeline already ends at. Building them as separate pages
// would triple the query code and let the four drift into disagreeing about the
// same run.
//
// WHAT MADE THIS POSSIBLE
// Until migration 16 the platform could say what an agent's metrics ARE but
// never what they DID: streamed snapshots were upserted onto one row, so each
// overwrote the last. Reliability is a trajectory — ending at FRR 0.6 having
// fallen from 0.9 is a different problem from climbing there from 0.3 — and
// that shape was being discarded. The data was already arriving; it is now kept.
//
// UNDEFINED IS A GAP, NEVER A ZERO
// A metric may be legitimately undefined: IRS before any fault, CSI within one
// session. Charts BREAK the line at those points rather than drawing to the
// floor. A line falling to zero reads as catastrophic failure; the truth is
// that nothing was measured.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Activity, Play, Pause, SkipBack, SkipForward, OctagonX,
  GitCompare, ScrollText, Loader2, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ───────────────────────────────────────────────────────────────────
interface Snapshot {
  step_count: number
  pei: number | null
  frr: number | null
  irs: number | null
  ti: number | null
  csi: number | null
  breach_count: number
  halted: boolean
  recorded_at: string
}

interface SessionRow {
  session_id: string
  agent_id: string
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  step_count: number
  breach_count: number
  halted: boolean
  halt_reason: string | null
  status: string
  pei_live: number | null
  frr_live: number | null
  irs_live: number | null
  ti_live: number | null
  csi_live: number | null
  overhead_p50_ms: number | null
  overhead_p99_ms: number | null
  overhead_samples: number | null
  thresholds: Record<string, number> | null
}

interface BreachEvent {
  id: string
  metric: string
  value: number
  threshold: number
  step_index: number
  occurred_at: string
}

interface HaltAudit {
  metric: string | null
  metric_value: number | null
  threshold: number | null
  consecutive_steps: number | null
  step_index: number | null
  policy: Record<string, unknown> | null
  reason: string | null
  trigger_source: string
  occurred_at: string
}

type View = 'timeline' | 'replay' | 'compare' | 'audit'

const METRICS = [
  { key: 'pei' as const, label: 'PEI', full: 'Planning Efficiency', max: 1, color: '#3b82f6' },
  { key: 'frr' as const, label: 'FRR', full: 'Failure Resilience', max: 1, color: '#34d399' },
  { key: 'irs' as const, label: 'IRS', full: 'Intentional Recovery', max: 1, color: '#a78bfa' },
  { key: 'ti'  as const, label: 'TI',  full: 'Traceability',        max: 5, color: '#fbbf24' },
  { key: 'csi' as const, label: 'CSI', full: 'Consistency Stability', max: 1, color: '#f472b6' },
]

const SNAPSHOT_LIMIT = 2000
const REPLAY_INTERVAL_MS = 400

function fmt(v: number | null | undefined, digits = 3): string {
  return v === null || v === undefined ? '—' : v.toFixed(digits)
}

// ── Chart ───────────────────────────────────────────────────────────────────
function MetricChart({
  snapshots, metric, breaches, haltStep, upTo, threshold,
}: {
  snapshots: Snapshot[]
  metric: typeof METRICS[number]
  breaches: BreachEvent[]
  haltStep: number | null
  upTo?: number
  threshold?: number | null
}) {
  const W = 640, H = 130, PAD_L = 34, PAD_R = 10, PAD_T = 12, PAD_B = 22

  const visible = upTo === undefined
    ? snapshots
    : snapshots.filter(s => s.step_count <= upTo)

  if (snapshots.length < 2) {
    return (
      <div className="h-[130px] flex items-center justify-center text-[11px] text-slate-600">
        Not enough snapshots to plot
      </div>
    )
  }

  const maxStep = Math.max(...snapshots.map(s => s.step_count), 1)
  const x = (step: number) => PAD_L + (step / maxStep) * (W - PAD_L - PAD_R)
  const y = (val: number) => H - PAD_B - (Math.min(val, metric.max) / metric.max) * (H - PAD_T - PAD_B)

  // Segments break at undefined values, so a gap renders as a gap. Joining
  // across them would draw a line through a period nothing was measured.
  const segments: string[] = []
  let current: string[] = []
  for (const s of visible) {
    const v = s[metric.key]
    if (v === null || v === undefined) {
      if (current.length > 1) segments.push(current.join(' '))
      current = []
      continue
    }
    current.push(`${x(s.step_count).toFixed(1)},${y(v).toFixed(1)}`)
  }
  if (current.length > 1) segments.push(current.join(' '))

  const metricBreaches = breaches.filter(
    b => b.metric === metric.key && (upTo === undefined || b.step_index <= upTo),
  )
  const definedCount = snapshots.filter(
    s => s[metric.key] !== null && s[metric.key] !== undefined,
  ).length

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
           role="img" aria-label={`${metric.full} over ${maxStep} steps`}>
        {/* Axis */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B}
              stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B}
              stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        <text x={4} y={PAD_T + 8} fill="#64748b" fontSize="9">{metric.max}</text>
        <text x={4} y={H - PAD_B} fill="#64748b" fontSize="9">0</text>

        {/* Threshold: the line the metric must stay above */}
        {threshold != null && (
          <>
            <line x1={PAD_L} y1={y(threshold)} x2={W - PAD_R} y2={y(threshold)}
                  stroke="#f87171" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
            <text x={W - PAD_R - 2} y={y(threshold) - 3} fill="#f87171" fontSize="8"
                  textAnchor="end">floor {threshold}</text>
          </>
        )}

        {/* Halt marker */}
        {haltStep != null && (upTo === undefined || haltStep <= upTo) && (
          <line x1={x(haltStep)} y1={PAD_T} x2={x(haltStep)} y2={H - PAD_B}
                stroke="#ef4444" strokeWidth="1.5" opacity="0.8" />
        )}

        {segments.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke={metric.color}
                    strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {metricBreaches.map(b => (
          <circle key={b.id} cx={x(b.step_index)} cy={y(b.value)} r="3"
                  fill="#f87171" stroke="#0f172a" strokeWidth="1">
            <title>{`${b.metric.toUpperCase()} ${b.value.toFixed(3)} < ${b.threshold} at step ${b.step_index}`}</title>
          </circle>
        ))}
      </svg>
      {definedCount === 0 && (
        <p className="text-[10px] text-slate-600 -mt-1">
          Undefined throughout this session — not plotted as zero.
        </p>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function SessionDetailPage() {
  const params = useParams()
  const sessionId = String(params?.sessionId ?? '')

  const [view, setView] = useState<View>('timeline')
  const [session, setSession] = useState<SessionRow | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [breaches, setBreaches] = useState<BreachEvent[]>([])
  const [audit, setAudit] = useState<HaltAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Replay
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Compare
  const [others, setOthers] = useState<SessionRow[]>([])
  const [compareId, setCompareId] = useState('')
  const [compareSnaps, setCompareSnaps] = useState<Snapshot[]>([])
  const [compareRow, setCompareRow] = useState<SessionRow | null>(null)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()

      // RLS scopes every one of these to the signed-in user. No manual user_id
      // filter: adding one would imply the policy is optional and would mask a
      // policy regression instead of letting it fail loudly.
      const { data: s, error: sErr } = await supabase
        .from('monitoring_sessions')
        .select('session_id, agent_id, started_at, ended_at, duration_seconds, step_count, breach_count, halted, halt_reason, status, pei_live, frr_live, irs_live, ti_live, csi_live, overhead_p50_ms, overhead_p99_ms, overhead_samples, thresholds')
        .eq('session_id', sessionId)
        .maybeSingle()
      if (sErr) throw sErr
      if (!s) { setError('Session not found.'); setLoading(false); return }
      setSession(s as SessionRow)

      const { data: snaps } = await supabase
        .from('monitoring_snapshots')
        .select('step_count, pei, frr, irs, ti, csi, breach_count, halted, recorded_at')
        .eq('session_id', sessionId)
        .order('step_count', { ascending: true })
        .limit(SNAPSHOT_LIMIT)
      setSnapshots((snaps ?? []) as Snapshot[])
      setPlayhead((snaps ?? []).length ? (snaps as Snapshot[])[snaps!.length - 1].step_count : 0)

      const { data: evs } = await supabase
        .from('monitoring_events')
        .select('id, metric, value, threshold, step_index, occurred_at')
        .eq('session_id', sessionId)
        .order('step_index', { ascending: true })
      setBreaches((evs ?? []) as BreachEvent[])

      if ((s as SessionRow).halted) {
        const { data: a } = await supabase
          .from('halt_audit_log')
          .select('metric, metric_value, threshold, consecutive_steps, step_index, policy, reason, trigger_source, occurred_at')
          .eq('session_id', sessionId)
          .maybeSingle()
        if (a) setAudit(a as HaltAudit)
      }

      const { data: peers } = await supabase
        .from('monitoring_sessions')
        .select('session_id, agent_id, started_at, ended_at, duration_seconds, step_count, breach_count, halted, halt_reason, status, pei_live, frr_live, irs_live, ti_live, csi_live, overhead_p50_ms, overhead_p99_ms, overhead_samples, thresholds')
        .eq('agent_id', (s as SessionRow).agent_id)
        .neq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(25)
      setOthers((peers ?? []) as SessionRow[])

      setError('')
    } catch (err) {
      // Surfaced rather than swallowed: an empty page that looks like "no data"
      // when the real cause is a broken query wastes an operator's time at
      // exactly the moment they can least afford it.
      setError(err instanceof Error ? err.message : 'Could not load this session.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { if (sessionId) load() }, [sessionId, load])

  // Replay playback
  useEffect(() => {
    if (!playing || snapshots.length === 0) return
    const maxStep = snapshots[snapshots.length - 1].step_count
    const id = setInterval(() => {
      setPlayhead(p => {
        if (p >= maxStep) { setPlaying(false); return maxStep }
        const next = snapshots.find(s => s.step_count > p)
        return next ? next.step_count : maxStep
      })
    }, REPLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playing, snapshots])

  async function loadComparison(id: string) {
    setCompareId(id)
    if (!id) { setCompareSnaps([]); setCompareRow(null); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('monitoring_snapshots')
      .select('step_count, pei, frr, irs, ti, csi, breach_count, halted, recorded_at')
      .eq('session_id', id)
      .order('step_count', { ascending: true })
      .limit(SNAPSHOT_LIMIT)
    setCompareSnaps((data ?? []) as Snapshot[])
    setCompareRow(others.find(o => o.session_id === id) ?? null)
  }

  const haltStep = audit?.step_index ?? null
  const maxStep = snapshots.length ? snapshots[snapshots.length - 1].step_count : 0
  const atPlayhead = useMemo(() => {
    const upto = snapshots.filter(s => s.step_count <= playhead)
    return upto.length ? upto[upto.length - 1] : null
  }, [snapshots, playhead])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-500" size={26} />
    </div>
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">

        <Link href="/dashboard/monitoring"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-5">
          <ArrowLeft size={14} /> Monitoring
        </Link>

        {error && (
          <div className="card p-4 mb-6 flex items-start gap-2.5"
               style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {session && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                  <Activity size={22} className="text-blue-400" />
                  <span className="truncate">{session.agent_id}</span>
                  {session.halted && (
                    <span className="text-[10px] px-2 py-0.5 rounded shrink-0"
                          style={{ background: 'rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                      halted
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-1">{session.session_id}</p>
              </div>
              <div className="flex gap-4 text-right text-xs">
                <div><p className="text-slate-500">Steps</p>
                     <p className="text-lg font-semibold text-white">{session.step_count}</p></div>
                <div><p className="text-slate-500">Breaches</p>
                     <p className="text-lg font-semibold"
                        style={{ color: session.breach_count ? '#fbbf24' : '#e2e8f0' }}>
                       {session.breach_count}</p></div>
                <div><p className="text-slate-500">Duration</p>
                     <p className="text-lg font-semibold text-white">
                       {session.duration_seconds != null ? `${session.duration_seconds}s` : '—'}</p></div>
              </div>
            </div>

            {/* View switch */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                ['timeline', 'Timeline', <Activity key="a" size={13} />],
                ['replay', 'Replay', <Play key="b" size={13} />],
                ['compare', 'Compare', <GitCompare key="c" size={13} />],
                ['audit', 'Audit', <ScrollText key="d" size={13} />],
              ] as const).map(([id, label, icon]) => (
                <button key={id} onClick={() => setView(id as View)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{
                          background: view === id ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${view === id ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: view === id ? '#bfdbfe' : '#cbd5e1',
                        }}>
                  {icon}{label}
                  {id === 'audit' && session.halted && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f87171' }} />
                  )}
                </button>
              ))}
            </div>

            {snapshots.length === 0 && view !== 'audit' && (
              <div className="card p-6 mb-6">
                <p className="text-sm text-slate-300 mb-1">No step-by-step history for this session</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Snapshots are kept from migration 16 onward, and only for sessions
                  that streamed while running. A session recorded before that, or
                  run with <code className="code-inline">stream=False</code>, has its
                  final metrics but no trajectory.
                </p>
              </div>
            )}

            {/* ── Timeline ── */}
            {view === 'timeline' && snapshots.length > 0 && (
              <div className="space-y-4">
                {METRICS.map(m => (
                  <div key={m.key} className="card p-4">
                    <div className="flex items-baseline justify-between mb-1">
                      <div>
                        <span className="text-sm font-semibold text-white">{m.label}</span>
                        <span className="text-[11px] text-slate-500 ml-2">{m.full}</span>
                      </div>
                      <span className="text-sm font-mono text-slate-200">
                        {fmt(session[`${m.key}_live` as keyof SessionRow] as number | null,
                             m.max === 5 ? 2 : 3)}
                      </span>
                    </div>
                    <MetricChart snapshots={snapshots} metric={m} breaches={breaches}
                                 haltStep={haltStep}
                                 threshold={session.thresholds?.[m.key] ?? null} />
                  </div>
                ))}
                <p className="text-[11px] text-slate-600">
                  Red dots mark threshold breaches; the dashed line is the floor;
                  the vertical line is where Safe Halt stopped the run. Gaps are
                  steps where a metric was undefined — never drawn as zero.
                </p>
              </div>
            )}

            {/* ── Replay ── */}
            {view === 'replay' && snapshots.length > 0 && (
              <div className="space-y-4">
                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => { setPlayhead(0); setPlaying(false) }}
                            className="p-1.5 rounded text-slate-300 hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.04)' }} aria-label="Restart">
                      <SkipBack size={14} />
                    </button>
                    <button onClick={() => setPlaying(p => !p)}
                            className="p-1.5 rounded text-slate-200"
                            style={{ background: 'rgba(59,130,246,0.18)' }}
                            aria-label={playing ? 'Pause' : 'Play'}>
                      {playing ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => { setPlayhead(maxStep); setPlaying(false) }}
                            className="p-1.5 rounded text-slate-300 hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.04)' }} aria-label="Jump to end">
                      <SkipForward size={14} />
                    </button>
                    <input type="range" min={0} max={maxStep} value={playhead}
                           onChange={e => { setPlayhead(Number(e.target.value)); setPlaying(false) }}
                           className="flex-1" aria-label="Step position" />
                    <span className="text-xs text-slate-400 font-mono w-24 text-right">
                      step {playhead} / {maxStep}
                    </span>
                  </div>
                  {/* Values AS THEY STOOD at the playhead, not the final ones.
                      Showing the end state during a replay would defeat the
                      entire point of replaying. */}
                  <div className="grid grid-cols-5 gap-2">
                    {METRICS.map(m => (
                      <div key={m.key} className="rounded p-2 text-center"
                           style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-[10px] text-slate-500">{m.label}</p>
                        <p className="text-sm font-mono" style={{ color: m.color }}>
                          {fmt(atPlayhead ? atPlayhead[m.key] : null, m.max === 5 ? 2 : 3)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {atPlayhead?.halted && (
                    <p className="text-xs text-red-300 mt-2 flex items-center gap-1.5">
                      <OctagonX size={12} /> Halted at this point
                    </p>
                  )}
                </div>

                {METRICS.map(m => (
                  <div key={m.key} className="card p-4">
                    <span className="text-sm font-semibold text-white">{m.label}</span>
                    <MetricChart snapshots={snapshots} metric={m} breaches={breaches}
                                 haltStep={haltStep} upTo={playhead}
                                 threshold={session.thresholds?.[m.key] ?? null} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Compare ── */}
            {view === 'compare' && (
              <div className="space-y-4">
                <div className="card p-4">
                  <label className="text-xs text-slate-400 block mb-2">
                    Compare with another session from <span className="text-slate-200">{session.agent_id}</span>
                  </label>
                  <div className="relative">
                    <select value={compareId} onChange={e => loadComparison(e.target.value)}
                            className="w-full text-sm rounded-lg px-3 py-2 appearance-none"
                            style={{ background: 'rgba(255,255,255,0.04)',
                                     border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                      <option value="">Select a session…</option>
                      {others.map(o => (
                        <option key={o.session_id} value={o.session_id}>
                          {o.started_at ? new Date(o.started_at).toLocaleString() : o.session_id.slice(0, 8)}
                          {' · '}{o.step_count} steps{o.halted ? ' · halted' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
                  </div>
                  {others.length === 0 && (
                    <p className="text-[11px] text-slate-600 mt-2">
                      No other sessions recorded for this agent yet.
                    </p>
                  )}
                </div>

                {compareRow && (
                  <>
                    <div className="card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wide text-slate-500"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th className="text-left font-medium px-4 py-2.5">Metric</th>
                            <th className="text-left font-medium px-4 py-2.5">This session</th>
                            <th className="text-left font-medium px-4 py-2.5">Selected</th>
                            <th className="text-left font-medium px-4 py-2.5">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {METRICS.map(m => {
                            const a = session[`${m.key}_live` as keyof SessionRow] as number | null
                            const b = compareRow[`${m.key}_live` as keyof SessionRow] as number | null
                            // A delta needs both sides defined. Treating an
                            // undefined value as zero would manufacture a
                            // change that never happened.
                            const comparable = a != null && b != null
                            const delta = comparable ? a - b : null
                            return (
                              <tr key={m.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td className="px-4 py-2.5 text-slate-300">{m.label}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-200">
                                  {fmt(a, m.max === 5 ? 2 : 3)}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-400">
                                  {fmt(b, m.max === 5 ? 2 : 3)}</td>
                                <td className="px-4 py-2.5 font-mono text-xs">
                                  {delta === null ? (
                                    <span className="text-slate-600">not comparable</span>
                                  ) : (
                                    <span style={{ color: delta > 0.001 ? '#34d399' : delta < -0.001 ? '#f87171' : '#94a3b8' }}>
                                      {delta > 0 ? '+' : ''}{delta.toFixed(3)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {compareSnaps.length > 0 && METRICS.map(m => (
                      <div key={m.key} className="card p-4">
                        <div className="flex items-baseline gap-3 mb-1">
                          <span className="text-sm font-semibold text-white">{m.label}</span>
                          <span className="text-[10px]" style={{ color: m.color }}>■ this session</span>
                          <span className="text-[10px] text-slate-500">■ selected</span>
                        </div>
                        <MetricChart snapshots={snapshots} metric={m} breaches={breaches}
                                     haltStep={haltStep}
                                     threshold={session.thresholds?.[m.key] ?? null} />
                        <MetricChart snapshots={compareSnaps}
                                     metric={{ ...m, color: '#64748b' }} breaches={[]}
                                     haltStep={null}
                                     threshold={session.thresholds?.[m.key] ?? null} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Audit ── */}
            {view === 'audit' && (
              <div className="space-y-4">
                {!session.halted ? (
                  <div className="card p-6">
                    <p className="text-sm text-slate-300 mb-1">This session was not halted</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Safe Halt records a decision only when it stops a run. A session
                      that finished on its own has no halt decision to audit.
                    </p>
                  </div>
                ) : !audit ? (
                  <div className="card p-6">
                    <p className="text-sm text-amber-300 mb-1">Halted, but no audit record</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The session is flagged as halted with no matching entry in the
                      audit log. Sessions halted before migration 13 have no record,
                      since the table did not exist. Reported rather than hidden:
                      a decision the system cannot explain should be visible as such.
                    </p>
                    {session.halt_reason && (
                      <p className="text-xs text-slate-300 mt-3">
                        Reason recorded on the session: {session.halt_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="card p-5" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
                      <h2 className="text-sm font-semibold text-white flex items-center gap-1.5 mb-3">
                        <OctagonX size={14} className="text-red-400" /> Halt decision
                      </h2>
                      <p className="text-sm text-red-300 mb-4">{audit.reason}</p>
                      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        {([
                          ['Metric', audit.metric ? audit.metric.toUpperCase() : '—'],
                          ['Value at halt', fmt(audit.metric_value)],
                          ['Floor', fmt(audit.threshold)],
                          ['Consecutive steps under', audit.consecutive_steps ?? '—'],
                          ['Step index', audit.step_index ?? '—'],
                          ['Triggered by', audit.trigger_source],
                          ['Occurred at', new Date(audit.occurred_at).toLocaleString()],
                        ] as const).map(([k, v]) => (
                          <div key={k} className="flex justify-between"
                               style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 4 }}>
                            <span className="text-slate-500">{k}</span>
                            <span className="text-slate-200 font-mono">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* The policy exactly as it stood. A halt must remain
                        reproducible against the rule that produced it, even
                        after the user changes their configuration. */}
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold text-white mb-2">Policy in force</h3>
                      <pre className="text-[12px] font-mono text-slate-300 overflow-x-auto p-3 rounded"
                           style={{ background: 'rgba(0,0,0,0.25)' }}>
{JSON.stringify(audit.policy ?? {}, null, 2)}
                      </pre>
                      <p className="text-[11px] text-slate-600 mt-2">
                        Stored verbatim at the moment of the decision, so the halt stays
                        reproducible even if the policy is changed later.
                      </p>
                    </div>
                  </>
                )}

                {session.overhead_samples != null && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-white mb-2">Cost of monitoring</h3>
                    <div className="flex gap-6 text-xs">
                      <div><p className="text-slate-500">p50</p>
                           <p className="font-mono text-slate-200">{fmt(session.overhead_p50_ms, 4)} ms</p></div>
                      <div><p className="text-slate-500">p99</p>
                           <p className="font-mono text-slate-200">{fmt(session.overhead_p99_ms, 4)} ms</p></div>
                      <div><p className="text-slate-500">Steps measured</p>
                           <p className="font-mono text-slate-200">{session.overhead_samples}</p></div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      Per-step overhead this monitoring added to the agent&rsquo;s own
                      execution path.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
