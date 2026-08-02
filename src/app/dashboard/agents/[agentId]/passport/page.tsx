'use client'
// src/app/dashboard/agents/[agentId]/passport/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Agent Passport.
//
// WHAT THIS PAGE IS FOR
// Somebody outside the team — an auditor, a customer, a reviewer — asking
// "how has this agent actually behaved?" and getting an answer they can check
// without trusting the person who handed it to them.
//
// So the page leads with the evidence and the signature, not with a score.
//
// NO GRADE, ON PURPOSE
// There is no "HIGH RELIABILITY" banner. Five numbers are shown and the
// weakest is named, because a single label is exactly where a weak dimension
// hides — an agent excellent at four and broken at the fifth is a broken
// agent, and a summary word would say otherwise.
//
// UNDEFINED IS A DASH
// A metric that was never measured shows as "—", never as 0.00. CSI needs
// repeated runs; IRS needs an observed fault. Rendering either as zero would
// put a measured failure on screen for a dimension nothing examined.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import PublishPanel from './PublishPanel'
import {
  BadgeCheck, ShieldAlert, ArrowLeft, Download, Copy, Check, Loader2,
  AlertTriangle, OctagonX, ExternalLink, RefreshCw,
} from 'lucide-react'

interface Halt {
  session_id: string
  metric: string | null
  value: number | null
  threshold: number | null
  consecutive_steps: number | null
  policy: Record<string, unknown> | null
  reason: string | null
  triggered_by: string
  at: string
}

interface Passport {
  schema_version: string
  issued_at: string
  window: { days: number; since: string }
  issuer: { name: string; url: string; protocol_version: string; statement: string }
  identity: {
    agent_id: string; name: string; created_at: string
    plan: string; active: boolean
  }
  reliability: {
    metrics: Record<string, number | null>
    metric_names: Record<string, string>
    undefined: string[]
    weakest: { metric: string; name: string; value: number; of_maximum: number } | null
    note: string
  }
  operational_record: {
    sessions: number; steps_executed: number; runtime_hours: number
    sessions_halted: number; total_breaches: number
  }
  safety_record: {
    halt_decisions: number; halts: Halt[]
    alerts_raised: number; alerts_delivered: number; alerts_failed: number
  }
  measurement: {
    battery_spec_fingerprint: string | null
    monitoring_overhead_p50_ms: number | null
    monitoring_overhead_p99_ms: number | null
    note: string
  }
  signature: {
    signed: boolean
    algorithm?: string
    key_id?: string
    value?: string
    content_sha256: string
    public_key_url?: string
    reason?: string
  }
}

const METRIC_ORDER = ['pei', 'frr', 'irs', 'ti', 'csi'] as const
const METRIC_MAX: Record<string, number> = { pei: 1, frr: 1, irs: 1, ti: 5, csi: 1 }
const WINDOWS = [30, 90, 365]

function fmt(v: number | null | undefined, max: number): string {
  return v === null || v === undefined ? '—' : v.toFixed(max === 5 ? 2 : 3)
}

export default function PassportPage() {
  const params = useParams()
  const agentId = String(params?.agentId ?? '')

  const [passport, setPassport] = useState<Passport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(90)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async (window: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/passport?days=${window}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Could not load the passport.')
      setPassport(json as Passport)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the passport.')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { if (agentId) load(days) }, [agentId, days, load])

  function download() {
    if (!passport) return
    const blob = new Blob([JSON.stringify(passport, null, 2)],
                          { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passport-${passport.identity.agent_id}-${days}d.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyJson() {
    if (!passport) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(passport, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard can fail on an insecure context; the file still downloads */ }
  }

  if (loading && !passport) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-500" size={26} />
    </div>
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <Link href={`/dashboard/agents/${agentId}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-5">
          <ArrowLeft size={14} /> Agent
        </Link>

        {error && (
          <div className="card p-4 mb-6 flex items-start gap-2.5"
               style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {passport && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
              <div className="min-w-0">
                <p className="section-label mb-1">Agent Passport</p>
                <h1 className="text-2xl font-bold text-white truncate">
                  {passport.identity.name}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {passport.identity.agent_id}
                </p>
              </div>

              {/* Signature status, prominent. It is the reason this document is
                  worth anything to somebody who did not generate it. */}
              <div className="flex items-center gap-2 shrink-0 rounded-lg px-3 py-2"
                   style={{
                     background: passport.signature.signed
                       ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                     border: `1px solid ${passport.signature.signed
                       ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)'}`,
                   }}>
                {passport.signature.signed
                  ? <BadgeCheck size={16} className="text-emerald-400" />
                  : <ShieldAlert size={16} className="text-amber-400" />}
                <div>
                  <p className="text-xs"
                     style={{ color: passport.signature.signed ? '#6ee7b7' : '#fcd34d' }}>
                    {passport.signature.signed ? 'Signed' : 'Unsigned'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {passport.signature.signed
                      ? `${passport.signature.algorithm} · ${passport.signature.key_id}`
                      : 'Cannot be verified'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Issued {new Date(passport.issued_at).toUTCString()} · covering{' '}
              {passport.window.days} days
            </p>

            {/* Window */}
            <div className="flex gap-2 mb-6">
              {WINDOWS.map(w => (
                <button key={w} onClick={() => setDays(w)} disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-60"
                        style={{
                          background: days === w ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${days === w ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: days === w ? '#bfdbfe' : '#cbd5e1',
                        }}>
                  {loading && days === w
                    ? <Loader2 size={11} className="animate-spin inline" />
                    : w === 365 ? '1 year' : `${w} days`}
                </button>
              ))}
            </div>

            {/* Reliability */}
            <div className="card p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-4">Reliability</h2>
              <div className="grid sm:grid-cols-5 gap-3 mb-4">
                {METRIC_ORDER.map(key => {
                  const value = passport.reliability.metrics[key]
                  const isWeakest = passport.reliability.weakest?.metric === key
                  const undef = value === null || value === undefined
                  return (
                    <div key={key} className="rounded-lg p-3 text-center"
                         style={{
                           background: isWeakest ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.03)',
                           border: `1px solid ${isWeakest ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.06)'}`,
                         }}>
                      <p className="text-[10px] text-slate-500 mb-0.5">
                        {key.toUpperCase()}
                      </p>
                      <p className="text-lg font-mono"
                         style={{ color: undef ? '#64748b' : (isWeakest ? '#fca5a5' : '#e2e8f0') }}>
                        {fmt(value, METRIC_MAX[key])}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                        {passport.reliability.metric_names[key]}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Named, not graded. */}
              {passport.reliability.weakest && (
                <p className="text-xs text-slate-300 mb-2">
                  Weakest dimension:{' '}
                  <span className="text-red-300">
                    {passport.reliability.weakest.name}
                  </span>{' '}
                  at {passport.reliability.weakest.value} —{' '}
                  {(passport.reliability.weakest.of_maximum * 100).toFixed(0)}% of
                  its maximum.
                </p>
              )}
              {passport.reliability.undefined.length > 0 && (
                <p className="text-xs text-slate-500 mb-2">
                  Never measured:{' '}
                  {passport.reliability.undefined.map(m => m.toUpperCase()).join(', ')}
                  {' '}— shown as a dash, not as zero.
                </p>
              )}
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {passport.reliability.note}
              </p>
            </div>

            {/* Operational record */}
            <div className="card p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-3">
                Operational record
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {([
                  ['Sessions', passport.operational_record.sessions],
                  ['Steps', passport.operational_record.steps_executed.toLocaleString()],
                  ['Hours', passport.operational_record.runtime_hours],
                  ['Halted', passport.operational_record.sessions_halted],
                  ['Breaches', passport.operational_record.total_breaches],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-lg p-2.5"
                       style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-lg font-semibold text-white">{value}</p>
                    <p className="text-[10px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety record — the decisions, not a count of them. */}
            <div className="card p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-1">Safety record</h2>
              <p className="text-[11px] text-slate-500 mb-3">
                {passport.safety_record.alerts_raised} alert
                {passport.safety_record.alerts_raised === 1 ? '' : 's'} raised ·{' '}
                {passport.safety_record.alerts_delivered} delivered
                {passport.safety_record.alerts_failed > 0 && (
                  <span className="text-amber-400">
                    {' '}· {passport.safety_record.alerts_failed} failed
                  </span>
                )}
              </p>

              {passport.safety_record.halts.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No halt decisions in this window.
                </p>
              ) : (
                <div className="space-y-2">
                  {passport.safety_record.halts.map((h, i) => (
                    <div key={`${h.session_id}-${i}`} className="rounded-lg p-3"
                         style={{
                           background: 'rgba(255,255,255,0.03)',
                           borderLeft: '2px solid #f87171',
                         }}>
                      <p className="text-xs text-red-300 flex items-center gap-1.5">
                        <OctagonX size={12} /> {h.reason}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {h.metric?.toUpperCase()} {h.value} below {h.threshold} for{' '}
                        {h.consecutive_steps} steps · triggered by {h.triggered_by} ·{' '}
                        {new Date(h.at).toLocaleString()}
                      </p>
                      {/* The policy verbatim: a halt stays reproducible against
                          the rule that caused it, even after that rule changes. */}
                      {h.policy && Object.keys(h.policy).length > 0 && (
                        <pre className="text-[10px] font-mono text-slate-500 mt-1.5">
{JSON.stringify(h.policy)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Measurement provenance */}
            <div className="card p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-3">Measurement</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Battery specification</span>
                  <span className="font-mono text-slate-300">
                    {passport.measurement.battery_spec_fingerprint ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Monitoring overhead</span>
                  <span className="font-mono text-slate-300">
                    p50 {passport.measurement.monitoring_overhead_p50_ms ?? '—'} ms ·
                    p99 {passport.measurement.monitoring_overhead_p99_ms ?? '—'} ms
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-3 leading-relaxed">
                {passport.measurement.note}
              </p>
            </div>

            {/* Verification. The whole point: check it without asking us. */}
            <div className="card p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-2">Verification</h2>
              {passport.signature.signed ? (
                <>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Signed with {passport.signature.algorithm}. Anyone can verify
                    this document offline using the published public key — no
                    account, no request to us, no permission needed.
                  </p>
                  <div className="space-y-1.5 text-[11px] mb-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Key</span>
                      <span className="font-mono text-slate-300">
                        {passport.signature.key_id}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Content hash</span>
                      <span className="font-mono text-slate-300 truncate max-w-[280px]">
                        {passport.signature.content_sha256}
                      </span>
                    </div>
                  </div>
                  <ol className="text-[11px] text-slate-500 space-y-1 mb-3">
                    <li>1. Remove the <code className="code-inline">signature</code> object.</li>
                    <li>2. Serialise as JSON with sorted keys and no whitespace.</li>
                    <li>3. Verify <code className="code-inline">signature.value</code> over those bytes.</li>
                  </ol>
                  <a href="/api/passport-key" target="_blank" rel="noopener noreferrer"
                     className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                    Public key <ExternalLink size={11} />
                  </a>
                </>
              ) : (
                <p className="text-xs text-amber-300 leading-relaxed">
                  {passport.signature.reason} The figures above are still drawn
                  from real records, but a third party cannot confirm that this
                  document was issued by HB-Eval or that it has not been edited.
                </p>
              )}
            </div>

            {/* What this document is — carried inside it, so it cannot be
                separated from its own disclaimer. */}
            <div className="card p-5 mb-6">
              <p className="text-xs text-slate-400 leading-relaxed">
                {passport.issuer.statement}
              </p>
            </div>

            {/* Publishing sits after the document: read what you are about
                to make public before making it public. */}
            <div className="mb-6">
              <PublishPanel agentId={agentId} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={download}
                      className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                <Download size={13} /> Download JSON
              </button>
              <button onClick={copyJson}
                      className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => load(days)} disabled={loading}
                      className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
                <RefreshCw size={13} /> Reissue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
