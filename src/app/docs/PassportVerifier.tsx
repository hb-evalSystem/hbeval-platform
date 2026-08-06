'use client'
// src/app/docs/PassportVerifier.tsx
//
// Verify a passport, here, in the reader's own browser.
//
// WHY THIS IS NOT A SERVER ROUTE
// A verifier we run and report the result of proves nothing: the reader would
// be trusting our answer about our own document, which is precisely the
// dependency a signature exists to remove.
//
// Everything below runs locally. Paste a passport, and the check happens on
// the reader's machine against a public key fetched separately from the
// document. If our server were lying, this component would say so.
//
// WHY IT SITS IN THE DOCUMENTATION
// The three verification steps are written a few paragraphs above. Somebody
// reading them should be able to try them immediately rather than opening an
// editor — the distance between "I could check this" and "I checked this" is
// where trust is actually won.
import { useState } from 'react'
import { ShieldCheck, ShieldX, ShieldAlert, Loader2 } from 'lucide-react'

type Result =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'valid'; demo: boolean; expired: boolean; id: string; keyId: string }
  | { state: 'invalid'; reason: string }
  | { state: 'error'; reason: string }

/** Canonical bytes: sorted keys, no whitespace, signature block removed.
 *  Mirrors the signer exactly — any deviation rejects valid passports. */
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

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

/** Raw Ed25519 key wrapped in the SPKI header Web Crypto requires. */
function spkiFromRaw(raw: Uint8Array): ArrayBuffer {
  const header = new Uint8Array([48, 42, 48, 5, 6, 3, 43, 101, 112, 3, 33, 0])
  const out = new Uint8Array(header.length + raw.length)
  out.set(header)
  out.set(raw, header.length)
  return out.buffer as ArrayBuffer
}

export default function PassportVerifier() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Result>({ state: 'idle' })

  async function verify() {
    setResult({ state: 'checking' })
    try {
      const passport = JSON.parse(input) as Record<string, unknown>
      const sig = passport.signature as
        { signed?: boolean; value?: string; key_id?: string } | undefined

      if (!sig?.signed || !sig.value) {
        setResult({ state: 'invalid',
                    reason: 'This passport was issued without a signature.' })
        return
      }

      // Fetched separately from the document on purpose: a key travelling
      // inside the thing it validates proves nothing.
      const keyRes = await fetch('/api/passport-key')
      const keyInfo = await keyRes.json()
      if (!keyInfo?.available || !keyInfo.public_key_b64) {
        setResult({ state: 'error',
                    reason: 'The public key could not be retrieved just now.' })
        return
      }

      const key = await crypto.subtle.importKey(
        'spki', spkiFromRaw(b64ToBytes(keyInfo.public_key_b64)),
        { name: 'Ed25519' }, false, ['verify'],
      )
      const ok = await crypto.subtle.verify(
        { name: 'Ed25519' }, key,
        b64ToBytes(sig.value).buffer as ArrayBuffer,
        canonicalBytes(passport),
      )

      if (!ok) {
        setResult({ state: 'invalid',
                    reason: 'The signature does not match this document. It '
                          + 'may have been altered after it was issued.' })
        return
      }

      const expiresAt = String(passport.expires_at ?? '')
      setResult({
        state: 'valid',
        // Reported because a demo passport carries a real signature over a
        // document that says demo. Verifying it must not read as endorsing a
        // deployed agent — the mark sits inside the signed bytes for exactly
        // this reason.
        demo: passport.demo === true,
        expired: Boolean(expiresAt) && new Date(expiresAt) < new Date(),
        id: String(passport.passport_id ?? 'unknown'),
        keyId: String(sig.key_id ?? 'unknown'),
      })
    } catch (err) {
      // Ed25519 in Web Crypto is not universal yet, and a page that silently
      // showed nothing would leave a reader unable to tell "unverifiable" from
      // "unverified".
      setResult({
        state: 'error',
        reason: err instanceof SyntaxError
          ? 'That is not valid JSON. Paste the whole passport file.'
          : 'This browser could not run the check. Ed25519 support in Web '
            + 'Crypto is required; the document can still be verified with any '
            + 'standard tool.',
      })
    }
  }

  return (
    <div className="rounded-xl p-5 my-4"
         style={{ background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)' }}>
      <p className="text-sm text-slate-100 mb-1">Try it on a real passport</p>
      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
        Paste any passport JSON. The check runs in your browser against the
        published key — nothing is sent to us, and our answer is not involved.
      </p>

      <textarea value={input} onChange={e => setInput(e.target.value)}
                rows={5} placeholder='{"schema_version": "1.1", ...}'
                className="w-full text-[11px] font-mono rounded-lg px-3 py-2 mb-3"
                style={{ background: 'rgba(0,0,0,0.3)',
                         border: '1px solid rgba(255,255,255,0.1)',
                         color: '#cbd5e1', resize: 'vertical' }} />

      <button onClick={verify} disabled={!input.trim() || result.state === 'checking'}
              className="btn-secondary text-xs px-4 py-2 disabled:opacity-50">
        {result.state === 'checking'
          ? <Loader2 size={13} className="animate-spin inline" />
          : 'Verify in my browser'}
      </button>

      {result.state === 'valid' && (
        <div className="mt-3 rounded-lg p-3"
             style={{ background: 'rgba(52,211,153,0.10)',
                      border: '1px solid rgba(52,211,153,0.3)' }}>
          <p className="text-xs text-emerald-300 flex items-center gap-1.5 mb-1">
            <ShieldCheck size={13} /> Signature valid
          </p>
          <p className="text-[11px] text-slate-300">
            {result.id} · signed with key {result.keyId}
          </p>
          {result.demo && (
            <p className="text-[11px] text-amber-300 mt-1.5">
              This is a demonstration passport. The signature is genuine; what
              it attests is that HB-Eval issued a demo document. It describes no
              deployed agent.
            </p>
          )}
          {result.expired && (
            <p className="text-[11px] text-amber-300 mt-1.5">
              It has expired. The signature is still valid — the figures are
              simply old, and behaviour changes.
            </p>
          )}
        </div>
      )}

      {result.state === 'invalid' && (
        <div className="mt-3 rounded-lg p-3"
             style={{ background: 'rgba(248,113,113,0.10)',
                      border: '1px solid rgba(248,113,113,0.3)' }}>
          <p className="text-xs text-red-300 flex items-center gap-1.5">
            <ShieldX size={13} /> {result.reason}
          </p>
        </div>
      )}

      {result.state === 'error' && (
        <div className="mt-3 rounded-lg p-3"
             style={{ background: 'rgba(251,191,36,0.10)',
                      border: '1px solid rgba(251,191,36,0.3)' }}>
          <p className="text-xs text-amber-300 flex items-center gap-1.5">
            <ShieldAlert size={13} /> {result.reason}
          </p>
        </div>
      )}
    </div>
  )
}
