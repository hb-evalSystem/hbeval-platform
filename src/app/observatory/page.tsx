// app/observatory/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Observatory — public reliability statistics across contributing
// deployments.
//
// PUBLIC BY DESIGN: no sign-in, no key. The point is to be citable. It reads
// the Gateway's unauthenticated aggregate endpoint, which is backed by a
// database function that returns aggregates only and refuses to answer at all
// until enough distinct accounts are represented. Nothing here can reach a
// raw session, because the public role has no access to that table.
//
// WHY THIS PAGE EXISTS
// Published reliability studies measure agents under controlled conditions.
// This measures them in deployment. The gap between those two numbers is the
// project's central claim, and this is where it becomes observable rather
// than asserted.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Telescope, AlertTriangle, Loader2, ArrowLeft, ShieldCheck, Users, Info,
} from 'lucide-react'

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

interface MetricStat {
  avg: number | null
  sample_n: number
}

interface Summary {
  available: boolean
  reason?: string
  min_contributors?: number
  sessions_total?: number
  sessions_live?: number
  contributors?: number
  metrics?: Record<string, MetricStat>
  runs_with_breach?: number
  runs_halted?: number
  weakest_links?: { metric: string; runs: number }[]
  step_distribution?: { bucket: string; runs: number }[]
  updated_at?: string
}

const METRIC_INFO: Record<string, { label: string; full: string; max: number }> = {
  pei: { label: 'PEI', full: 'Planning Efficiency', max: 1 },
  frr: { label: 'FRR', full: 'Failure Resilience', max: 1 },
  irs: { label: 'IRS', full: 'Intentional Recovery', max: 1 },
  ti:  { label: 'TI',  full: 'Traceability', max: 5 },
  csi: { label: 'CSI', full: 'Consistency Stability', max: 1 },
}

// "—" for a metric no run defined. Rendering 0.00 would claim a measured
// failure on a dimension nothing measured — the error this project exists
// to argue against.
function fmt(v: number | null | undefined, digits = 3): string {
  return v === null || v === undefined ? '—' : v.toFixed(digits)
}

export default function ObservatoryPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/v1/observatory`, {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`Gateway returned ${res.status}`)
        const json = (await res.json()) as Summary
        if (!cancelled) { setData(json); setError('') }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load statistics.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">

        <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-3">
            <Telescope size={30} className="text-blue-400" />
            The Reliability Observatory
          </h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Aggregate operational-reliability statistics from agents running in real
            deployments. Benchmarks measure what an agent can do under clean
            conditions; this measures how much of that survives contact with
            failure.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-16">
            <Loader2 className="animate-spin" size={18} /> Loading statistics…
          </div>
        )}

        {error && !loading && (
          <div className="card p-5 flex items-start gap-2.5"
               style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300">Statistics are unavailable right now</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Below the k-anonymity threshold the API publishes nothing. Say why,
            plainly: an empty page with no explanation reads as a broken
            product rather than a deliberate privacy floor. */}
        {!loading && !error && data && !data.available && (
          <div className="card p-8">
            <ShieldCheck size={26} className="text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Not enough contributors yet
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mb-4">
              Statistics are withheld until at least{' '}
              <span className="text-slate-200">{data.min_contributors ?? 5}</span>{' '}
              independent accounts have contributed. A figure drawn from fewer
              could be traced back to the deployments behind it, and would not be
              sound to report in any case.
            </p>
            {typeof data.sessions_total === 'number' && data.sessions_total > 0 && (
              <p className="text-xs text-slate-600">
                {data.sessions_total.toLocaleString()} sessions recorded so far.
              </p>
            )}
          </div>
        )}

        {!loading && !error && data?.available && (
          <>
            {/* Scale */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Sessions observed', value: (data.sessions_total ?? 0).toLocaleString() },
                { label: 'From live deployments', value: (data.sessions_live ?? 0).toLocaleString() },
                { label: 'Contributing accounts', value: (data.contributors ?? 0).toLocaleString() },
                { label: 'Runs with a breach', value: (data.runs_with_breach ?? 0).toLocaleString() },
              ].map((s) => (
                <div key={s.label} className="card p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">{s.label}</p>
                  <p className="text-2xl font-semibold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              Reliability across contributing deployments
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-3">
              {Object.entries(METRIC_INFO).map(([key, info]) => {
                const stat = data.metrics?.[key]
                const pct = stat?.avg != null ? (stat.avg / info.max) * 100 : 0
                return (
                  <div key={key} className="card p-5">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{info.label}</span>
                      <span className="text-[11px] text-slate-500">
                        n = {(stat?.sample_n ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">{info.full}</p>
                    <p className="text-3xl font-semibold text-white mb-3">
                      {fmt(stat?.avg, info.max === 5 ? 2 : 3)}
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden"
                         style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full"
                           style={{ width: `${Math.min(100, Math.max(0, pct))}%`,
                                    background: 'linear-gradient(90deg,#3b82f6,#7c3aed)' }} />
                    </div>
                    {(stat?.sample_n ?? 0) === 0 && (
                      <p className="text-[11px] text-slate-600 mt-2">
                        Undefined in every run so far — not scored as zero.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-600 mb-8 flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0" />
              n is how many runs actually defined that metric. IRS is undefined
              without an injected fault, and CSI needs repeated runs — so their
              bases are legitimately smaller, and averaging them as zero would
              understate reliability across the board.
            </p>

            {/* Weakest links — the headline finding */}
            {data.weakest_links && data.weakest_links.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-slate-300 mb-3">
                  Which dimension fails most often
                </h2>
                <div className="card p-5 mb-8">
                  <div className="space-y-3">
                    {data.weakest_links.map((w) => {
                      const top = data.weakest_links![0].runs || 1
                      return (
                        <div key={w.metric} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-300 w-10 uppercase">
                            {w.metric}
                          </span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden"
                               style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full"
                                 style={{ width: `${(w.runs / top) * 100}%`, background: '#fbbf24' }} />
                          </div>
                          <span className="text-xs text-slate-500 w-20 text-right">
                            {w.runs.toLocaleString()} runs
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-4">
                    Under the weakest-link rule, the lowest required metric governs the
                    tier. Whichever dimension appears most here is the one holding the
                    ecosystem back.
                  </p>
                </div>
              </>
            )}

            {/* Method + privacy */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                <Users size={14} className="text-blue-400" /> How this is collected
              </h2>
              <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <li>
                  <span className="text-slate-200">Opt-in only.</span> Nothing is
                  published from any account unless its owner explicitly enables
                  contribution. It is off by default.
                </li>
                <li>
                  <span className="text-slate-200">Anonymous at the source.</span>
                  {' '}Agent identifiers, account identifiers, metadata and step
                  labels are dropped before a contribution is written — they are
                  never stored here, not merely hidden from this page.
                </li>
                <li>
                  <span className="text-slate-200">Withheld below{' '}
                  {data.min_contributors ?? 5} contributors.</span> A statistic
                  from a handful of deployments could identify them.
                </li>
                <li>
                  <span className="text-slate-200">Reference baseline included.</span>
                  {' '}Alongside live contributions, this includes the author&rsquo;s
                  published research dataset, which is open in the project
                  repository. Live and baseline counts are reported separately
                  above.
                </li>
              </ul>
              {data.updated_at && (
                <p className="text-[11px] text-slate-600 mt-4">
                  Updated {new Date(data.updated_at).toLocaleString('en', {
                    dateStyle: 'medium', timeStyle: 'short',
                  })}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-8">
              Measured with HB-Eval&rsquo;s five behavioural metrics under systematic
              fault injection.{' '}
              <Link href="/" className="text-blue-400 hover:text-blue-300">
                Read the methodology →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
