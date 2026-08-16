'use client'
// src/app/verify/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Verify a passport yourself.
//
// WHY THIS PAGE EXISTS AT ALL
// A signature is only worth something if somebody outside the organisation
// that produced it can check it. The public page already verifies a passport it
// serves — but that is us showing you our own document and telling you it is
// fine. This page takes a file YOU hold, that we never saw, and checks it in
// YOUR browser.
//
// Nothing is uploaded. The file is read locally, the public key is fetched
// separately, and the verification runs in the tab. If this page were doing the
// check on our server it would prove nothing at all, since the answer would
// again be ours.
//
// WHY IT ALSO RECOMPUTES THE METRICS
// A valid signature proves the document was not altered. It does not prove the
// numbers inside it were derived correctly in the first place. For demo traces,
// which carry their own step-by-step record, the arithmetic can be redone here
// and compared — which is a different and stronger claim: not only untampered,
// but arithmetically consistent with the steps it reports.
import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Upload, ShieldCheck, ShieldAlert, ShieldX, Loader2,
  FileJson, Calculator,
} from 'lucide-react'

type Verdict = 'idle' | 'checking' | 'valid' | 'invalid' | 'unsigned' | 'error'

interface Recheck {
  ran: boolean
  matches: boolean
  details: string[]
}

/** Canonical bytes — must mirror the signer exactly. */
function canonicalBytes(passport: Record<string, unknown>): ArrayBuffer {
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
  const { signature: _drop, ...body } = passport
  return new TextEncoder().encode(JSON.stringify(sortDeep(body))).buffer as ArrayBuffer
}

function spkiFromRaw(raw: Uint8Array): ArrayBuffer {
  const header = new Uint8Array([48, 42, 48, 5, 6, 3, 43, 101, 112, 3, 33, 0])
  const out = new Uint8Array(header.length + raw.length)
  out.set(header)
  out.set(raw, header.length)
  return out.buffer as ArrayBuffer
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

/**
 * Recompute the five metrics from a step trace, and compare.
 *
 * The arithmetic is the SDK's, restated: running tallies, undefined where
 * nothing was measured. If this disagrees with what the document claims, the
 * document is internally inconsistent even if its signature is perfect.
 */
function recheckMetrics(doc: Record<string, unknown>): Recheck {
  const steps = (doc as { steps?: unknown[] }).steps
  if (!Array.isArray(steps) || steps.length === 0) {
    return { ran: false, matches: false, details: [] }
  }

  let replans = 0, faulted = 0, faultedSurvived = 0
  let judged = 0, deliberate = 0, traceable = 0

  for (const raw of steps) {
    const s = raw as Record<string, unknown>
    if (s.replanned) replans++
    if (s.traceable !== false) traceable++
    if (s.hadFault) {
      faulted++
      if (s.success) faultedSurvived++
      const rec = s.recoveredIntentionally
      if (rec !== null && rec !== undefined) {
        judged++
        if (rec) deliberate++
      }
    }
  }

  const n = steps.length
  const computed: Record<string, number | null> = {
    pei: Math.max(0, 1 - replans / n),
    frr: faulted ? faultedSurvived / faulted : null,
    irs: judged ? deliberate / judged : null,
    ti: Math.round((5 * traceable / n) * 100) / 100,
    csi: null,
  }

  const claimed = (steps[steps.length - 1] as { metrics?: Record<string, number | null> })
    ?.metrics ?? {}

  const details: string[] = []
  let matches = true
  for (const key of ['pei', 'frr', 'irs', 'ti'] as const) {
    const a = computed[key]
    const b = claimed[key] ?? null
    const same = (a === null && b === null)
      || (a !== null && b !== null && Math.abs(a - b) < 1e-6)
    if (!same) matches = false
    details.push(
      `${key.toUpperCase()}: claimed ${b === null ? '—' : b.toFixed(4)}`
      + `, recomputed ${a === null ? '—' : a.toFixed(4)}`
      + `${same ? '' : '  ← mismatch'}`,
    )
  }
  return { ran: true, matches, details }
}

export default function VerifyPage() {
  const [verdict, setVerdict] = useState<Verdict>('idle')
  const [message, setMessage] = useState('')
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null)
  const [recheck, setRecheck] = useState<Recheck | null>(null)

  const handle = useCallback(async (file: File) => {
    setVerdict('checking')
    setMessage('')
    setDoc(null)
    setRecheck(null)

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setVerdict('error')
      setMessage('That file is not valid JSON.')
      return
    }
    setDoc(parsed)

    // Traces carry steps; passports carry a signature. Both are useful, and
    // saying which one arrived avoids a confusing "unsigned" verdict on a file
    // that was never meant to be signed.
    const trace = recheckMetrics(parsed)
    setRecheck(trace.ran ? trace : null)

    const sig = parsed.signature as { signed?: boolean; value?: string } | undefined
    if (!sig?.signed || !sig.value) {
      setVerdict('unsigned')
      setMessage(trace.ran
        ? 'This is a demo trace, not a passport. It carries no signature — but '
          + 'its metrics were recomputed below.'
        : 'This document carries no signature, so nothing can be verified.')
      return
    }

    try {
      const keyRes = await fetch('/api/passport-key')
      const keyInfo = await keyRes.json()
      if (!keyInfo?.available) {
        setVerdict('error')
        setMessage('The public key could not be retrieved. A signature does not '
                 + 'expire — try again later.')
        return
      }

      const key = await crypto.subtle.importKey(
        'spki', spkiFromRaw(b64ToBytes(keyInfo.public_key_b64)),
        { name: 'Ed25519' }, false, ['verify'],
      )
      const ok = await crypto.subtle.verify(
        { name: 'Ed25519' }, key,
        b64ToBytes(sig.value).buffer as ArrayBuffer, canonicalBytes(parsed),
      )
      setVerdict(ok ? 'valid' : 'invalid')
      setMessage(ok
        ? 'The signature matches. This document was issued by HB-Eval and has '
          + 'not been altered since.'
        : 'The signature does not match this document. It was altered after '
          + 'issue, or signed with a different key.')
    } catch {
      setVerdict('error')
      setMessage('This browser cannot verify Ed25519 signatures. The document '
               + 'can still be checked with any standard tool using the '
               + 'published key.')
    }
  }, [])

  const look: Record<Verdict, { colour: string; Icon: typeof ShieldCheck; label: string }> = {
    idle: { colour: '#94a3b8', Icon: ShieldAlert, label: 'No file yet' },
    checking: { colour: '#94a3b8', Icon: Loader2, label: 'Checking…' },
    valid: { colour: '#34d399', Icon: ShieldCheck, label: 'Signature valid' },
    invalid: { colour: '#f87171', Icon: ShieldX, label: 'Signature does not match' },
    unsigned: { colour: '#fbbf24', Icon: ShieldAlert, label: 'Unsigned document' },
    error: { colour: '#fbbf24', Icon: ShieldAlert, label: 'Could not check' },
  }
  const v = look[verdict]

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/docs#passport"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> Documentation
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">Verify a passport</h1>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          Drop in a passport or a demo trace. The file is read in this browser
          and never uploaded — the public key is fetched separately and the
          check runs on your machine, because a verification we performed for
          you would just be us vouching for ourselves.
        </p>

        <label className="card p-8 block text-center cursor-pointer mb-6">
          <input type="file" accept="application/json,.json" className="hidden"
                 onChange={e => {
                   const f = e.target.files?.[0]
                   if (f) handle(f)
                 }} />
          <Upload size={22} className="text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-200">Choose a JSON file</p>
          <p className="text-[11px] text-slate-500 mt-1">
            A passport, or an exported demo trace
          </p>
        </label>

        {verdict !== 'idle' && (
          <div className="card p-5 mb-4"
               style={{ borderColor: `${v.colour}55` }}>
            <p className="text-sm flex items-center gap-2 mb-1.5" style={{ color: v.colour }}>
              <v.Icon size={16} className={verdict === 'checking' ? 'animate-spin' : ''} />
              {v.label}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>

            {verdict === 'valid' && doc?.demo === true && (
              <p className="text-[11px] text-amber-300 mt-2">
                This is a demonstration passport. The signature is genuine — what
                it attests is that HB-Eval issued a demo document. It describes
                no deployed agent.
              </p>
            )}
          </div>
        )}

        {/* The stronger claim: not merely untampered, but arithmetically
            consistent with the steps it reports. */}
        {recheck?.ran && (
          <div className="card p-5 mb-4">
            <p className="text-sm text-white flex items-center gap-2 mb-2">
              <Calculator size={14} className="text-blue-400" />
              Metrics recomputed from the steps
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {recheck.matches
                ? 'Every figure was rederived from the step trace and matches '
                  + 'what the document claims. A valid signature proves nothing '
                  + 'was altered; this proves the numbers follow from the steps.'
                : 'The figures do not follow from the steps in this file. That '
                  + 'is a stronger problem than a bad signature: the document is '
                  + 'internally inconsistent.'}
            </p>
            <pre className="text-[11px] font-mono text-slate-400 p-3 rounded overflow-x-auto"
                 style={{ background: 'rgba(0,0,0,0.25)' }}>
{recheck.details.join('\n')}
            </pre>
          </div>
        )}

        {doc && (
          <details className="card p-5">
            <summary className="text-sm text-slate-200 cursor-pointer flex items-center gap-2">
              <FileJson size={14} className="text-slate-400" /> The document
            </summary>
            <pre className="text-[11px] font-mono text-slate-400 mt-3 p-3 rounded overflow-x-auto max-h-96"
                 style={{ background: 'rgba(0,0,0,0.25)' }}>
{JSON.stringify(doc, null, 2)}
            </pre>
          </details>
        )}

        <p className="text-[11px] text-slate-500 mt-6">
          Prefer to check it offline? The public key and the three-step
          procedure are in the{' '}
          <Link href="/docs#passport" className="text-blue-400 hover:text-blue-300">
            documentation
          </Link>
          . Nothing here is required — this page exists to save you writing
          Ed25519 code, not to sit between you and the answer.
        </p>
      </div>
    </div>
  )
}
