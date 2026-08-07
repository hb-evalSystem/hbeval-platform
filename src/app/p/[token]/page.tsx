'use client'
// src/app/p/[token]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The public face of an Agent Passport.
//
// WHO THIS IS FOR
// Somebody with no account here — an auditor, a customer, a reviewer, a
// journalist — who was handed a link and wants to know whether to believe it.
//
// THE VERIFICATION RUNS IN THEIR BROWSER
// This is the single most important decision on the page. The signature is
// checked with the Web Crypto API, in the visitor's own browser, against a
// public key fetched separately. We are not asked whether the document is
// valid; their machine works it out.
//
// A page that displayed "✓ Verified" because our server said so would be worth
// nothing — it would be us vouching for ourselves, which is precisely what a
// signed document exists to make unnecessary. The check happening locally is
// what converts "trust HB-Eval" into "trust mathematics".
//
// A DISTINCT VISUAL IDENTITY
// Deliberately unlike the dashboard. This is a document, not an application
// screen: it should be recognisable at a glance as an HB-Eval Agent Passport
// wherever it is embedded, screenshotted or printed.
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Passport {
  schema_version: string
  passport_id: string
  issued_at: string
  expires_at: string
  issuer: { name: string; issued_by: string; protocol_version: string; statement: string }
  identity: { agent_id: string; name: string; created_at: string; plan: string }
  reliability: {
    metrics: Record<string, number | null>
    metric_names: Record<string, string>
    undefined: string[]
    weakest: { metric: string; name: string; value: number; of_maximum: number } | null
    evidence: { level: string; meaning: string; sessions: number; steps: number; note: string }
    timeline: Array<{ window_days: number; sessions: number; metrics: Record<string, number | null> }>
    note: string
  }
  operational_record: {
    sessions: number; steps_executed: number; runtime_hours: number
    sessions_halted: number; total_breaches: number
  }
  safety_record: {
    halt_decisions: number
    halts: Array<{ reason: string | null; metric: string | null; value: number | null
                   threshold: number | null; at: string; triggered_by: string }>
    alerts_raised: number; alerts_delivered: number; alerts_failed: number
  }
  provenance?: {
    model: string | string[] | null
    model_version: string | string[] | null
    prompt_version: string | string[] | null
    framework: string | string[] | null
    commit: string | string[] | null
    changed_during_window: string[]
    note: string
    warning?: string
  }
  measurement: {
    fingerprint: string
    battery_spec_fingerprint: string | null
    monitoring_overhead_p50_ms: number | null
    monitoring_overhead_p99_ms: number | null
    note: string
  }
  signature: { signed: boolean; algorithm?: string; key_id?: string
               value?: string; content_sha256: string }
}

type VerifyState = 'checking' | 'valid' | 'invalid' | 'unavailable'

const METRIC_ORDER = ['pei', 'frr', 'irs', 'ti', 'csi'] as const
const METRIC_MAX: Record<string, number> = { pei: 1, frr: 1, irs: 1, ti: 5, csi: 1 }

// The passport's own palette — deep navy and gold. Distinct from the product
// so the document is recognisable on its own.
const INK = '#0a1628'
const PAPER = '#0d1b2f'
const GOLD = '#c9a227'
const RULE = 'rgba(201,162,39,0.22)'

function fmt(v: number | null | undefined, max: number): string {
  return v === null || v === undefined ? '—' : v.toFixed(max === 5 ? 2 : 3)
}

/** Canonical bytes, mirroring the signer exactly: sorted keys, no whitespace,
 *  signature block removed. Any deviation and every valid passport is rejected. */
function canonicalBytes(passport: Passport): ArrayBuffer {
  const sortDeep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortDeep)
    if (v && typeof v === 'object') {
      return Object.keys(v as Record<string, unknown>).sort().reduce(
        (acc, k) => { acc[k] = sortDeep((v as Record<string, unknown>)[k]); return acc },
        {} as Record<string, unknown>,
      )
    }
    return v
  }
  const { signature: _drop, ...body } = passport as unknown as Record<string, unknown>
  return new TextEncoder().encode(JSON.stringify(sortDeep(body))).buffer as ArrayBuffer
}

/** Wrap a raw Ed25519 public key in the SPKI header Web Crypto expects. */
function spkiFromRaw(raw: Uint8Array): ArrayBuffer {
  const header = new Uint8Array([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ])
  // Returned as a plain ArrayBuffer: Web Crypto's BufferSource excludes views
  // backed by SharedArrayBuffer, and TypeScript enforces that distinction.
  const out = new Uint8Array(header.length + raw.length)
  out.set(header)
  out.set(raw, header.length)
  return out.buffer as ArrayBuffer
}

function b64ToBytes(b64: string): ArrayBuffer {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer as ArrayBuffer
}

export default function PublicPassportPage({ params }: { params: { token: string } }) {
  const [passport, setPassport] = useState<Passport | null>(null)
  const [status, setStatus] = useState<string>('loading')
  const [detail, setDetail] = useState('')
  const [verify, setVerify] = useState<VerifyState>('checking')
  const [verifyNote, setVerifyNote] = useState('')

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_published_passport', {
        t: params.token,
      })
      if (error) throw error

      const result = data as Record<string, unknown>
      if (!result?.found) {
        setStatus(String(result?.reason ?? 'not_found'))
        setDetail(String(result?.note ?? ''))
        return
      }
      setPassport(result.passport as Passport)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }, [params.token])

  useEffect(() => { load() }, [load])

  // Verification, locally. Runs after the document arrives.
  useEffect(() => {
    if (!passport) return
    let cancelled = false

    ;(async () => {
      try {
        if (!passport.signature?.signed || !passport.signature.value) {
          if (!cancelled) {
            setVerify('unavailable')
            setVerifyNote('This passport was issued without a signature.')
          }
          return
        }

        // Fetched separately from the document on purpose: a key travelling
        // inside the thing it validates proves nothing.
        const keyRes = await fetch('/api/passport-key')
        const keyInfo = await keyRes.json()
        if (!keyInfo?.available || !keyInfo.public_key_b64) {
          if (!cancelled) {
            setVerify('unavailable')
            setVerifyNote('The public key could not be retrieved just now. '
                        + 'The signature has not expired — try again later, or '
                        + 'verify offline.')
          }
          return
        }

        const key = await crypto.subtle.importKey(
          'spki',
          spkiFromRaw(new Uint8Array(b64ToBytes(keyInfo.public_key_b64))),
          { name: 'Ed25519' },
          false,
          ['verify'],
        )
        const ok = await crypto.subtle.verify(
          { name: 'Ed25519' },
          key,
          b64ToBytes(passport.signature.value),
          canonicalBytes(passport),
        )
        if (!cancelled) {
          setVerify(ok ? 'valid' : 'invalid')
          setVerifyNote(ok
            ? 'Checked in this browser against the published public key.'
            : 'The signature does not match this document. It may have been '
            + 'altered after it was issued.')
        }
      } catch {
        if (!cancelled) {
          setVerify('unavailable')
          // Ed25519 in Web Crypto is not universal yet, and a page that
          // silently showed nothing would leave a visitor unable to tell
          // "unverifiable" from "unverified".
          setVerifyNote('This browser cannot verify Ed25519 signatures. The '
                      + 'document can still be verified with the published key '
                      + 'using any standard tool.')
        }
      }
    })()

    return () => { cancelled = true }
  }, [passport])

  // ── Not available ──
  if (status !== 'ok') {
    const messages: Record<string, [string, string]> = {
      loading: ['Loading…', ''],
      not_found: ['No such passport', 'This link does not correspond to a published passport.'],
      revoked: ['Withdrawn', 'The owner has withdrawn this passport. It was published and is no longer.'],
      expired: ['Expired', detail || 'Behaviour changes, so passports expire. Ask the owner to reissue.'],
      error: ['Unavailable', 'This passport could not be loaded.'],
    }
    const [title, body] = messages[status] ?? messages.error
    return (
      <div style={{ background: INK, minHeight: '100vh' }}
           className="flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: GOLD }}>
            HB-EVAL AGENT PASSPORT
          </p>
          <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
        </div>
      </div>
    )
  }

  const p = passport!
  const expired = new Date(p.expires_at) < new Date()

  const verifyLook: Record<VerifyState, { colour: string; label: string }> = {
    checking: { colour: '#94a3b8', label: 'Checking signature…' },
    valid: { colour: '#34d399', label: 'Signature valid' },
    invalid: { colour: '#f87171', label: 'Signature does not match' },
    unavailable: { colour: '#fbbf24', label: 'Not verified here' },
  }
  const vl = verifyLook[verify]

  return (
    <div style={{ background: INK, minHeight: '100vh' }} className="px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Masthead — the recognisable part */}
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[0.35em] mb-2" style={{ color: GOLD }}>
            HB-EVAL AGENT PASSPORT
          </p>
          <div style={{ height: 1, background: RULE }} className="mb-5" />
          <h1 className="text-2xl font-semibold text-white">{p.identity.name}</h1>
          <p className="text-xs font-mono mt-1.5" style={{ color: GOLD }}>
            {p.passport_id}
          </p>
        </div>

        {/* Verification, first. It is the reason to read the rest. */}
        <div className="rounded-xl p-4 mb-6 text-center"
             style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <p className="text-sm font-medium mb-1" style={{ color: vl.colour }}>
            {vl.label}
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-lg mx-auto">
            {verifyNote || 'Verifying in your browser…'}
          </p>
          {verify === 'valid' && (
            <p className="text-[11px] text-slate-500 mt-2">
              Ed25519 · key {p.signature.key_id} · this check ran on your
              machine, not ours.
            </p>
          )}
        </div>

        {expired && (
          <div className="rounded-xl p-3 mb-6 text-center"
               style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <p className="text-xs text-amber-300">
              This passport expired on {new Date(p.expires_at).toLocaleDateString()}.
              The signature is still valid — the figures are simply old.
            </p>
          </div>
        )}

        {/* Metrics */}
        <div className="rounded-xl p-5 mb-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <p className="text-[11px] tracking-[0.2em] mb-4" style={{ color: GOLD }}>
            RELIABILITY
          </p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {METRIC_ORDER.map(k => {
              const v = p.reliability.metrics[k]
              const weakest = p.reliability.weakest?.metric === k
              const undef = v === null || v === undefined
              return (
                <div key={k} className="text-center rounded-lg py-3"
                     style={{
                       background: weakest ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.03)',
                       border: `1px solid ${weakest ? 'rgba(248,113,113,0.28)' : 'transparent'}`,
                     }}>
                  <p className="text-[10px] text-slate-500">{k.toUpperCase()}</p>
                  <p className="text-lg font-mono"
                     style={{ color: undef ? '#64748b' : weakest ? '#fca5a5' : '#e2e8f0' }}>
                    {fmt(v, METRIC_MAX[k])}
                  </p>
                </div>
              )
            })}
          </div>

          {p.reliability.weakest && (
            <p className="text-xs text-slate-300 mb-1">
              Weakest: <span className="text-red-300">{p.reliability.weakest.name}</span>
              {' '}at {p.reliability.weakest.value} —{' '}
              {(p.reliability.weakest.of_maximum * 100).toFixed(0)}% of its maximum.
            </p>
          )}
          {p.reliability.undefined.length > 0 && (
            <p className="text-[11px] text-slate-500">
              Never measured: {p.reliability.undefined.map(m => m.toUpperCase()).join(', ')}
              {' '}— shown as a dash, not zero.
            </p>
          )}
        </div>

        {/* Trajectory — what a single figure cannot show */}
        {p.reliability.timeline?.length > 0 && (
          <div className="rounded-xl p-5 mb-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <p className="text-[11px] tracking-[0.2em] mb-3" style={{ color: GOLD }}>
              OVER TIME
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-[10px]">
                  <th className="text-left font-normal pb-2">Window</th>
                  <th className="text-right font-normal pb-2">Sessions</th>
                  {METRIC_ORDER.map(k => (
                    <th key={k} className="text-right font-normal pb-2">{k.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.reliability.timeline.map(w => (
                  <tr key={w.window_days} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="py-2 text-slate-300">{w.window_days} days</td>
                    <td className="py-2 text-right text-slate-400">{w.sessions}</td>
                    {METRIC_ORDER.map(k => (
                      <td key={k} className="py-2 text-right font-mono text-slate-300">
                        {fmt(w.metrics[k], METRIC_MAX[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Cumulative from today. A figure falling from 0.9 to 0.6 is a
              different proposition from one climbing there from 0.3.
            </p>
          </div>
        )}

        {/* Record */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <p className="text-[11px] tracking-[0.2em] mb-3" style={{ color: GOLD }}>
              OPERATIONAL RECORD
            </p>
            {([
              ['Sessions', p.operational_record.sessions],
              ['Steps', p.operational_record.steps_executed.toLocaleString()],
              ['Runtime hours', p.operational_record.runtime_hours],
              ['Sessions halted', p.operational_record.sessions_halted],
              ['Threshold breaches', p.operational_record.total_breaches],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs py-1.5"
                   style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200 font-mono">{v}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <p className="text-[11px] tracking-[0.2em] mb-3" style={{ color: GOLD }}>
              SAFETY RECORD
            </p>
            {([
              ['Halt decisions', p.safety_record.halt_decisions],
              ['Alerts raised', p.safety_record.alerts_raised],
              ['Alerts delivered', p.safety_record.alerts_delivered],
              ['Alerts failed', p.safety_record.alerts_failed],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs py-1.5"
                   style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200 font-mono">{v}</span>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Undelivered alerts are counted. A record that hid them would read
              as though nothing happened.
            </p>
          </div>
        </div>

        {/* Evidence depth — stated so it cannot be read as a grade */}
        <div className="rounded-xl p-5 mb-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <p className="text-[11px] tracking-[0.2em] mb-2" style={{ color: GOLD }}>
            EVIDENCE DEPTH
          </p>
          <p className="text-sm text-slate-200 mb-1">
            {p.reliability.evidence.level}
            <span className="text-slate-500 text-xs">
              {' '}· {p.reliability.evidence.sessions} sessions,{' '}
              {p.reliability.evidence.steps.toLocaleString()} steps
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mb-1">{p.reliability.evidence.meaning}</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {p.reliability.evidence.note}
          </p>
        </div>

        {/* What produced these numbers. A record of behaviour that does not
            identify what behaved describes nothing in particular. */}
        {p.provenance && (
          <div className="rounded-xl p-5 mb-4"
               style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <p className="text-[11px] tracking-[0.2em] mb-3" style={{ color: GOLD }}>
              WHAT PRODUCED THIS
            </p>
            {p.provenance.warning && (
              <p className="text-[11px] text-amber-300 leading-relaxed mb-3">
                {p.provenance.warning}
              </p>
            )}
            {([['Model', p.provenance.model],
               ['Model version', p.provenance.model_version],
               ['Prompt version', p.provenance.prompt_version],
               ['Framework', p.provenance.framework],
               ['Commit', p.provenance.commit]] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-xs py-1.5"
                   style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-slate-500 shrink-0">{label}</span>
                <span className="font-mono text-right truncate"
                      style={{ color: value ? '#cbd5e1' : '#64748b' }}>
                  {Array.isArray(value) ? value.join(' \u2192 ') : (value ?? 'not recorded')}
                </span>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              {p.provenance.note}
            </p>
          </div>
        )}

        {/* Provenance */}
        <div className="rounded-xl p-5 mb-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <p className="text-[11px] tracking-[0.2em] mb-3" style={{ color: GOLD }}>
            PROVENANCE
          </p>
          {([
            ['Issued by', p.issuer.issued_by],
            ['Issued', new Date(p.issued_at).toUTCString()],
            ['Expires', new Date(p.expires_at).toUTCString()],
            ['Protocol', p.issuer.protocol_version],
            ['Measurement fingerprint', p.measurement.fingerprint],
            ['Battery specification', p.measurement.battery_spec_fingerprint ?? '—'],
            ['Agent id', p.identity.agent_id],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-xs py-1.5"
                 style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-slate-500 shrink-0">{k}</span>
              <span className="text-slate-300 font-mono text-right truncate">{v}</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            {p.measurement.note}
          </p>
        </div>

        {/* What this document is — carried inside it */}
        <div className="rounded-xl p-5 mb-6" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {p.issuer.statement}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-slate-500 mb-1">
            Verify independently with the public key at{' '}
            <a href="/api/passport-key" className="underline" style={{ color: GOLD }}>
              /api/passport-key
            </a>
          </p>
          <p className="text-[10px] text-slate-600">
            hbeval.com · schema {p.schema_version}
          </p>
        </div>
      </div>
    </div>
  )
}
