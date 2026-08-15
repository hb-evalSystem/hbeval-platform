'use client'
// src/app/demo/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The demo, and everything a visitor needs to act on it.
//
// THE ARC
// Watch an agent fail → see the fall in a chart → compare against the guarded
// run → take the code → take a signed passport. Conviction, then adoption.
//
// A demo that only convinces is a demo that gets closed. The distance between
// "that was interesting" and "I have this running" is where products are won,
// so the SDK snippet and the export sit on this page rather than a click away.
//
// WHAT IS HONEST HERE
// The agent's behaviour is scripted; the metrics are computed by
// hb-eval-sdk-js, the package on npm. There is no "Connected · Live Session"
// badge, because there is no live session — an indicator implying one would be
// a decoration that the first person to open developer tools would catch, and
// then doubt every other number on the page.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Playground, { DEFAULT_SETTINGS, type Settings } from './Playground'
import {
  Play, RotateCcw, ArrowLeft, ShieldCheck, ShieldOff, OctagonX, Loader2,
  CheckCircle2, XCircle, RefreshCw, ArrowRight, Columns2, Download,
  Copy, Check, BadgeCheck, FileJson, Package, SlidersHorizontal,
} from 'lucide-react'

interface Step {
  index: number
  action: string
  note: string
  success: boolean
  hadFault: boolean
  replanned: boolean
  metrics: Record<string, number | null>
  breaches: number
  halted: boolean
}

interface Trace {
  mode: string
  steps: Step[]
  haltedAt: number | null
  totalScripted: number
  haltReason: string | null
  haltRecord: Record<string, unknown> | null
  finalMetrics: Record<string, number | null>
  breachCount: number
  computedBy: { package: string; protocol: string; note: string }
  settings?: {
    faults: number; retries: number; metric: string; below: number
    forSteps: number
    thresholds: Record<string, number>
    defaults: Record<string, number>
    loweredFloors: string[]
    isDefault: boolean
  }
}

const METRICS = ['pei', 'frr', 'irs', 'ti'] as const
const METRIC_MAX: Record<string, number> = { pei: 1, frr: 1, irs: 1, ti: 5 }
const FLOOR: Record<string, number> = { pei: 0.7, frr: 0.65, irs: 0.6, ti: 3.0 }
const METRIC_NAME: Record<string, string> = {
  pei: 'Planning', frr: 'Resilience', irs: 'Recovery', ti: 'Traceability',
}
const LINE_COLOUR: Record<string, string> = {
  pei: '#60a5fa', frr: '#f87171', irs: '#fbbf24', ti: '#34d399',
}

const STEP_MS = 900
const SDK_VERSION_PY = '2.8.0'

function fmt(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : v.toFixed(2)
}

/**
 * A small multi-line chart, drawn as SVG.
 *
 * Written rather than pulled from a charting library: four series over ten
 * points needs no dependency, and this page is the first thing a visitor sees
 * — its load time is the first claim the product makes about itself.
 *
 * Undefined points BREAK the line rather than dropping to the axis. A line
 * falling to zero because a metric was not yet measurable would show a
 * collapse that never happened, which is the exact failure this project
 * refuses everywhere else.
 */
function Timeline({ steps, height = 130 }: { steps: Step[]; height?: number }) {
  if (steps.length < 2) return null

  const W = 560
  const H = height
  const PAD_L = 28
  const PAD_B = 18
  const PAD_T = 8

  const x = (i: number) => PAD_L + (i / (steps.length - 1)) * (W - PAD_L - 8)
  const y = (v: number, max: number) =>
    PAD_T + (1 - v / max) * (H - PAD_T - PAD_B)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
         aria-label="Metric values across the run">
      {/* Normalised gridlines: every metric is drawn against its own ceiling,
          so TI at 0–5 and FRR at 0–1 share the same vertical space. */}
      {[0, 0.5, 1].map(frac => (
        <g key={frac}>
          <line x1={PAD_L} x2={W - 8}
                y1={PAD_T + (1 - frac) * (H - PAD_T - PAD_B)}
                y2={PAD_T + (1 - frac) * (H - PAD_T - PAD_B)}
                stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <text x={4} y={PAD_T + (1 - frac) * (H - PAD_T - PAD_B) + 3}
                fill="#64748b" fontSize="8">{frac === 1 ? 'max' : frac === 0 ? '0' : '½'}</text>
        </g>
      ))}

      {METRICS.map(key => {
        const max = METRIC_MAX[key]!
        // Segments, not one path: a gap where the metric was undefined must
        // stay a gap.
        const segments: string[] = []
        let current: string[] = []
        steps.forEach((s, i) => {
          const v = s.metrics[key]
          if (v === null || v === undefined) {
            if (current.length > 1) segments.push(current.join(' '))
            current = []
            return
          }
          current.push(`${current.length ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v, max).toFixed(1)}`)
        })
        if (current.length > 1) segments.push(current.join(' '))

        return (
          <g key={key}>
            {segments.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={LINE_COLOUR[key]}
                    strokeWidth="1.8" strokeLinecap="round" />
            ))}
            {steps.map((s, i) => {
              const v = s.metrics[key]
              if (v === null || v === undefined) return null
              return <circle key={i} cx={x(i)} cy={y(v, max)} r="2"
                             fill={LINE_COLOUR[key]} />
            })}
          </g>
        )
      })}

      {steps.map((s, i) =>
        i % 2 === 0 ? (
          <text key={i} x={x(i)} y={H - 5} fill="#64748b" fontSize="8"
                textAnchor="middle">{s.index}</text>
        ) : null,
      )}
    </svg>
  )
}

function MetricGrid({ metrics }: { metrics: Record<string, number | null> }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {METRICS.map(k => {
        const v = metrics[k] ?? null
        const below = v !== null && v < FLOOR[k]!
        return (
          <div key={k} className="text-center rounded-lg py-2.5"
               style={{
                 background: below ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)',
                 border: `1px solid ${below ? 'rgba(248,113,113,0.35)' : 'transparent'}`,
               }}>
            <p className="text-[10px] text-slate-400">{k.toUpperCase()}</p>
            <p className="text-xl font-mono"
               style={{ color: v === null ? '#64748b' : below ? '#fca5a5' : '#e2e8f0' }}>
              {fmt(v)}
            </p>
            <p className="text-[9px] text-slate-500">{METRIC_NAME[k]}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function DemoPage() {
  const [traces, setTraces] = useState<Record<string, Trace>>({})
  const [mode, setMode] = useState<'unguarded' | 'guarded'>('unguarded')
  const [compare, setCompare] = useState(false)
  const [visible, setVisible] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [passport, setPassport] = useState<Record<string, unknown> | null>(null)
  const [passportBusy, setPassportBusy] = useState(false)
  const [showPlayground, setShowPlayground] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const fetchTrace = useCallback(
    async (which: string, s: Settings = DEFAULT_SETTINGS): Promise<Trace> => {
      // Always sent explicitly, even at defaults, so a run is reproducible
      // from its own URL rather than from whatever the server happens to
      // default to today.
      const params = new URLSearchParams({
        mode: which,
        faults: String(s.faults),
        retries: String(s.retries),
        metric: s.metric,
        below: String(s.below),
        for_steps: String(s.forSteps),
        floor_pei: String(s.floors.pei),
        floor_frr: String(s.floors.frr),
        floor_irs: String(s.floors.irs),
        floor_ti: String(s.floors.ti),
      })
      const res = await fetch(`/api/demo?${params}`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      return res.json() as Promise<Trace>
    }, [])

  const run = useCallback(async (which: 'unguarded' | 'guarded') => {
    setLoading(true); setPlaying(false); setVisible(0)
    setError(''); setCompare(false); setPassport(null)
    try {
      const data = await fetchTrace(which, settings)
      setTraces(t => ({ ...t, [which]: data }))
      setMode(which)
      setPlaying(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the demo.')
    } finally {
      setLoading(false)
    }
  }, [fetchTrace])

  useEffect(() => { run('unguarded') }, [run])

  useEffect(() => {
    const trace = traces[mode]
    if (!playing || !trace) return
    if (visible >= trace.steps.length) { setPlaying(false); return }
    const id = setTimeout(() => setVisible(v => v + 1), STEP_MS)
    return () => clearTimeout(id)
  }, [playing, visible, traces, mode])

  async function openCompare() {
    setLoading(true)
    try {
      const needed = (['unguarded', 'guarded'] as const)
      const fetched = await Promise.all(needed.map(m => fetchTrace(m, settings)))
      const merged = { ...traces }
      needed.forEach((m, i) => { merged[m] = fetched[i]! })
      setTraces(merged)
      setCompare(true)
      setPlaying(false)
    } catch {
      setError('Could not load both runs.')
    } finally {
      setLoading(false)
    }
  }

  async function issuePassport() {
    const trace = traces[mode]
    if (!trace) return
    setPassportBusy(true)
    try {
      const res = await fetch('/api/demo/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: trace.finalMetrics,
          steps: trace.steps.length,
          halted: Boolean(trace.haltedAt),
          halt_reason: trace.haltReason,
          breaches: trace.breachCount,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setPassport(await res.json())
    } catch {
      setError('Could not issue a demo passport just now.')
    } finally {
      setPassportBusy(false)
    }
  }

  function download(data: unknown, name: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)],
                          { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1800)
    } catch { /* the snippet is on screen and selectable */ }
  }

  const trace = traces[mode]
  const shown = trace?.steps.slice(0, visible) ?? []
  const current = shown[shown.length - 1]
  const done = trace ? visible >= trace.steps.length : false

  const pySnippet = `pip install hb-eval-sdk==${SDK_VERSION_PY}

from hb_eval_sdk import HBEvalClient

client = HBEvalClient(api_key=..., aes_key=..., signing_secret=...)

with client.monitor(
    agent_id="support-agent",
    halt_policy={"metric": "frr", "below": 0.5, "for_steps": 3},
) as session:
    for step in my_agent.run(task):
        session.record_step(
            action=step.name,
            success=step.ok,
            had_fault=step.faulted,
        )
        if session.should_halt:
            break`

  const tsSnippet = `npm install hb-eval-sdk-js

import { HBEvalClient } from 'hb-eval-sdk-js'

const client = new HBEvalClient({ apiKey, aesKey, signingSecret })

await client.withMonitor(
  { agentId: 'support-agent',
    haltPolicy: { metric: 'frr', below: 0.5, forSteps: 3 } },
  async (session) => {
    for (const step of await agent.run(task)) {
      session.recordStep({ action: step.name, success: step.ok,
                           hadFault: step.faulted })
      if (session.shouldHalt) break
    }
  },
)`

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Watch an agent fail</h1>
        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-3">
          The same support agent runs twice, against the same faults. One run
          has a reliability policy watching it; the other does not. Nothing else
          differs — and the numbers tell two very different stories.
        </p>

        {/* Honest provenance, in place of a fake "connected" indicator. This is
            checkable: install the package and you get the same figures. */}
        <p className="text-[11px] text-slate-500 mb-6 inline-flex items-center gap-1.5">
          <Package size={11} />
          Metrics computed by hb-eval-sdk-js — the package on npm — not written
          into this page.
        </p>

        {/* Playground. Collapsed by default: somebody arriving should watch
            the run before being handed dials, or the first thing they meet is
            configuration rather than the idea. */}
        <div className="mb-4">
          <button onClick={() => setShowPlayground(v => !v)}
                  className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5">
            <SlidersHorizontal size={12} />
            {showPlayground ? 'Hide the playground' : 'Change the conditions'}
          </button>
        </div>

        {showPlayground && (
          <Playground settings={settings} onChange={setSettings}
                      busy={loading}
                      loweredFloors={trace?.settings?.loweredFloors ?? []}
                      onRun={() => run(mode)} />
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          {([
            ['unguarded', 'Without a policy', ShieldOff,
             'The agent runs to completion. Nothing stops it.'],
            ['guarded', 'With Safe Halt', ShieldCheck,
             'A policy watches resilience and stops the run.'],
          ] as const).map(([id, label, Icon, hint]) => (
            <button key={id} onClick={() => run(id)} disabled={loading}
                    className="text-left px-4 py-3 rounded-xl transition-colors disabled:opacity-60 flex-1 min-w-[220px]"
                    style={{
                      background: (!compare && mode === id) ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${(!compare && mode === id) ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.10)'}`,
                    }}>
              <span className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: (!compare && mode === id) ? '#bfdbfe' : '#e2e8f0' }}>
                <Icon size={15} /> {label}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>
            </button>
          ))}
          <button onClick={openCompare} disabled={loading}
                  className="text-left px-4 py-3 rounded-xl transition-colors disabled:opacity-60 flex-1 min-w-[220px]"
                  style={{
                    background: compare ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${compare ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  }}>
            <span className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: compare ? '#ddd6fe' : '#e2e8f0' }}>
              <Columns2 size={15} /> Compare
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Both runs side by side.
            </span>
          </button>
        </div>

        {error && (
          <div className="card p-4 mb-6" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {loading && !trace && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-slate-500" size={26} />
          </div>
        )}

        {/* ── Comparison ── */}
        {compare && traces.unguarded && traces.guarded && (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {(['unguarded', 'guarded'] as const).map(m => {
                const t = traces[m]!
                return (
                  <div key={m} className="card p-5">
                    <p className="text-sm text-white mb-1 flex items-center gap-2">
                      {m === 'guarded'
                        ? <ShieldCheck size={14} className="text-emerald-400" />
                        : <ShieldOff size={14} className="text-amber-400" />}
                      {m === 'guarded' ? 'With Safe Halt' : 'Without a policy'}
                    </p>
                    <p className="text-[11px] text-slate-400 mb-3">
                      {t.haltedAt
                        ? `Stopped at step ${t.haltedAt} of ${t.totalScripted}`
                        : `Ran all ${t.totalScripted} steps to completion`}
                      {' · '}{t.breachCount} breaches
                    </p>
                    <MetricGrid metrics={t.finalMetrics} />
                    <div className="mt-3">
                      <Timeline steps={t.steps} height={110} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card p-5 mb-6" style={{ borderColor: 'rgba(167,139,250,0.3)' }}>
              <p className="text-sm text-white mb-2">Same agent. Same faults.</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                The unguarded run delivered its reply and would pass any
                completion check, ending at FRR{' '}
                <span className="font-mono text-amber-300">
                  {fmt(traces.unguarded.finalMetrics.frr)}
                </span>{' '}
                after {traces.unguarded.breachCount} breaches. The guarded run
                stopped {traces.guarded.haltedAt} steps in, before the wasted
                retries. The difference is one policy argument — everything else
                is identical.
              </p>
            </div>
          </>
        )}

        {/* ── Single run ── */}
        {!compare && trace && (
          <>
            <div className="card p-5 mb-4">
              <MetricGrid metrics={current?.metrics ?? {}} />
              <p className="text-[11px] text-slate-500 mt-3">
                A dash means the metric was never measured — resilience cannot be
                scored before a fault happens. It is never shown as zero.
              </p>
            </div>

            {/* The fall, visible */}
            {shown.length > 1 && (
              <div className="card p-5 mb-4">
                <p className="text-xs text-slate-300 mb-2">Across the run</p>
                <Timeline steps={shown} />
                <div className="flex flex-wrap gap-3 mt-2">
                  {METRICS.map(k => (
                    <span key={k} className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                      <span className="w-2.5 h-0.5 inline-block"
                            style={{ background: LINE_COLOUR[k] }} />
                      {k.toUpperCase()}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-600">
                    each drawn against its own ceiling; gaps are unmeasured
                  </span>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="card overflow-hidden mb-4">
              {shown.map(s => (
                <div key={s.index} className="px-4 py-2.5 flex items-start gap-3"
                     style={{ borderTop: s.index === 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-[11px] text-slate-600 font-mono w-5 shrink-0 pt-0.5">
                    {s.index}
                  </span>
                  {s.hadFault && !s.success
                    ? <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    : s.replanned
                      ? <RefreshCw size={14} className="text-blue-400 shrink-0 mt-0.5" />
                      : <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">{s.action}</p>
                    <p className="text-[11px] text-slate-500">{s.note}</p>
                  </div>
                </div>
              ))}
              {playing && (
                <div className="px-4 py-2.5 flex items-center gap-2"
                     style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <Loader2 size={13} className="animate-spin text-slate-600" />
                  <span className="text-[11px] text-slate-600">running…</span>
                </div>
              )}
            </div>

            {done && trace.haltedAt && (
              <div className="card p-5 mb-4" style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
                <p className="text-sm text-red-300 flex items-center gap-2 mb-2">
                  <OctagonX size={15} /> Safe Halt at step {trace.haltedAt} of {trace.totalScripted}
                </p>
                <p className="text-xs text-slate-300 mb-2">{trace.haltReason}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Nothing was killed mid-step. The session raised a flag, the
                  agent&rsquo;s own loop checked it and stopped — so no action was
                  left half-applied.
                </p>
              </div>
            )}

            {done && !trace.haltedAt && (
              <div className="card p-5 mb-4" style={{ borderColor: 'rgba(251,191,36,0.35)' }}>
                <p className="text-sm text-amber-200 mb-2">
                  The task completed. The behaviour did not recover.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  A pass/fail benchmark scores this a success. Under measurement
                  it reads differently: resilience ended at{' '}
                  <span className="font-mono text-amber-200">
                    {fmt(trace.finalMetrics.frr)}
                  </span>{' '}
                  against a floor of {FLOOR.frr}, after {trace.breachCount}{' '}
                  breaches — three of them identical retries with no reasoning in
                  between.
                </p>
                <button onClick={openCompare}
                        className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                  Compare with the guarded run <ArrowRight size={12} />
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-6">
              {!playing && (
                <button onClick={() => { setVisible(0); setPlaying(true) }}
                        className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                  {done ? <RotateCcw size={13} /> : <Play size={13} />}
                  {done ? 'Replay' : 'Play'}
                </button>
              )}
              {playing && (
                <button onClick={() => { setVisible(trace.steps.length); setPlaying(false) }}
                        className="btn-secondary text-xs px-4 py-2">
                  Skip to the end
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Take it with you ── */}
        {(done || compare) && trace && (
          <>
            <div className="card p-5 mb-4">
              <p className="text-sm text-white mb-3">Take the result</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => download(compare ? traces : trace,
                                                `hbeval-demo-${compare ? 'comparison' : mode}.json`)}
                        className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5">
                  <FileJson size={13} /> Export JSON
                </button>
                <button onClick={issuePassport} disabled={passportBusy}
                        className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
                  {passportBusy
                    ? <Loader2 size={13} className="animate-spin" />
                    : <BadgeCheck size={13} />}
                  Issue a demo passport
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                The export contains every step and every metric snapshot — the
                same data the platform stores for a real run.
              </p>
            </div>

            {/* The signed artefact. This is the claim the whole project rests
                on, made checkable by the visitor rather than described to them. */}
            {passport && (
              <div className="rounded-xl p-5 mb-4"
                   style={{ background: '#0d1b2f', border: '1px solid rgba(201,162,39,0.3)' }}>
                <p className="text-[11px] tracking-[0.28em] mb-3" style={{ color: '#c9a227' }}>
                  HB-EVAL AGENT PASSPORT · DEMONSTRATION
                </p>
                <p className="text-xs font-mono mb-3" style={{ color: '#c9a227' }}>
                  {String(passport.passport_id ?? '')}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Signed with Ed25519 against the same key that signs real
                  passports, and marked{' '}
                  <code className="code-inline">demo: true</code> inside the
                  signed bytes — so the mark cannot be removed without breaking
                  the signature. It expires in 24 hours.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => download(passport, 'hbeval-demo-passport.json')}
                          className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5">
                    <Download size={13} /> Download passport
                  </button>
                  <a href="/api/passport-key" target="_blank" rel="noopener noreferrer"
                     className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5">
                    Public key
                  </a>
                  <Link href="/verify"
                        className="btn-secondary text-xs px-3 py-2">
                    Verify it yourself
                  </Link>
                </div>
              </div>
            )}

            {/* Conviction to adoption. */}
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-2.5 flex items-center justify-between"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-slate-300">
                  Measure your own agent — Python
                </span>
                <button onClick={() => copy(pySnippet, 'py')}
                        className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1">
                  {copied === 'py' ? <Check size={11} /> : <Copy size={11} />}
                  {copied === 'py' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-[12px] font-mono text-slate-300 overflow-x-auto leading-relaxed"
                   style={{ background: 'rgba(0,0,0,0.25)' }}>{pySnippet}</pre>
            </div>

            <div className="card overflow-hidden mb-8">
              <div className="px-4 py-2.5 flex items-center justify-between"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-slate-300">
                  Measure your own agent — TypeScript
                </span>
                <button onClick={() => copy(tsSnippet, 'ts')}
                        className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1">
                  {copied === 'ts' ? <Check size={11} /> : <Copy size={11} />}
                  {copied === 'ts' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-[12px] font-mono text-slate-300 overflow-x-auto leading-relaxed"
                   style={{ background: 'rgba(0,0,0,0.25)' }}>{tsSnippet}</pre>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {([
                ['Full documentation', 'Every capability, with code', '/docs'],
                ['Fault Injection Studio', 'See what each fault does', '/dashboard/studio'],
                ['Create an account', 'Free: 500 evaluations a month', '/register'],
              ] as const).map(([title, hint, href]) => (
                <Link key={href} href={href} className="card p-4 block">
                  <p className="text-sm text-slate-100 mb-1">{title}</p>
                  <p className="text-[11px] text-slate-400">{hint}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
