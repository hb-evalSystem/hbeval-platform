'use client'
// src/app/dashboard/agents/[agentId]/passport/PublishPanel.tsx
//
// Publish a passport to a public link, with a QR code for it.
//
// PUBLISHING IS A DISCLOSURE
// A public link makes an agent's behaviour readable by anyone holding it —
// including the halts, the breaches and the failed alerts. That is the point:
// a passport nobody outside the team can reach is not a passport. It is also a
// decision, so the panel says plainly what becomes visible before the button
// is pressed, and withdrawal is one click and immediate.
//
// WHY THE QR MATTERS MORE THAN IT LOOKS
// A passport gets photographed, pasted into a slide, printed into a compliance
// pack. A URL in a screenshot cannot be followed; a QR code can. It turns a
// static image back into something checkable — which is the difference between
// a claim about an agent and evidence about one.
import { useCallback, useEffect, useState } from 'react'
import qrcode from 'qrcode-generator'
import {
  Globe, Link2, Copy, Check, Loader2, AlertTriangle, X, Eye, FileText,
} from 'lucide-react'

interface Publication {
  token: string
  passport_id: string
  issued_at: string
  expires_at: string
  revoked_at: string | null
  view_count: number
  published_at: string
}

/** QR as an SVG path. SVG rather than a bitmap because a passport gets
 *  printed and scaled, and a code that blurs at 2x is a code that will not
 *  scan. */
function qrPath(text: string, moduleSize = 4): { d: string; size: number } | null {
  try {
    // Version 0 lets the library pick the smallest that fits; level M recovers
    // around 15% damage, which is the right trade for something that will be
    // photographed off a screen.
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    const n = q.getModuleCount()
    const parts: string[] = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (q.isDark(r, c)) {
          parts.push(
            `M${c * moduleSize} ${r * moduleSize}h${moduleSize}v${moduleSize}h-${moduleSize}z`,
          )
        }
      }
    }
    return { d: parts.join(''), size: n * moduleSize }
  } catch {
    // A URL too long to encode returns null rather than a truncated code. A
    // truncated QR scans perfectly and leads somewhere wrong, which is worse
    // than showing none.
    return null
  }
}

export default function PublishPanel({ agentId }: { agentId: string }) {
  const [publications, setPublications] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/passport/publish`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Could not load publications.')
      setPublications(json.publications ?? [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load publications.')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  async function publish() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/agents/${agentId}/passport/publish`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Could not publish.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(token: string) {
    setBusy(true)
    try {
      await fetch(`/api/agents/${agentId}/passport/publish?token=${token}`, {
        method: 'DELETE',
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1800)
    } catch { /* the link is on screen and selectable */ }
  }

  const live = publications.filter(
    p => !p.revoked_at && new Date(p.expires_at) > new Date(),
  )

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
        <Globe size={15} className="text-blue-400" /> Public link
      </h2>
      <p className="text-xs text-slate-400 leading-relaxed mb-4 max-w-xl">
        Publish this passport to a link anyone can open and verify — no account
        needed. The signature is checked in their browser, not by us.
      </p>

      {error && (
        <p className="text-[11px] text-red-300 flex items-start gap-1.5 mb-3">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {loading ? (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> Loading…
        </p>
      ) : (
        <>
          {live.map(p => {
            const url = `${origin}/p/${p.token}`
            const qr = qrPath(url)
            return (
              <div key={p.token} className="rounded-lg p-4 mb-3"
                   style={{ background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(52,211,153,0.25)' }}>
                <div className="flex flex-wrap gap-4">
                  {/* QR. Rendered on a white plate: scanners need the
                      contrast, and a dark-on-dark code does not read. */}
                  {qr && (
                    <div className="shrink-0 rounded-lg p-2" style={{ background: '#fff' }}>
                      <svg width={qr.size} height={qr.size}
                           viewBox={`0 0 ${qr.size} ${qr.size}`}
                           role="img" aria-label="Scan to open this passport">
                        <path d={qr.d} fill="#0a1628" />
                      </svg>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500 mb-1">
                      {p.passport_id}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 size={12} className="text-slate-500 shrink-0" />
                      <code className="text-xs text-slate-300 truncate">{url}</code>
                      <button onClick={() => copy(url, p.token)}
                              className="text-slate-400 hover:text-slate-200 shrink-0">
                        {copied === p.token ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Expires {new Date(p.expires_at).toLocaleDateString()} ·{' '}
                      <span className="inline-flex items-center gap-1">
                        <Eye size={10} /> {p.view_count} view
                        {p.view_count === 1 ? '' : 's'}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {/* The printable copy carries the QR back to the live
                          page, so a compliance pack stays connected to
                          something checkable rather than becoming an
                          unverifiable claim once printed. */}
                      <a href={`/api/p/${p.token}/pdf`} target="_blank"
                         rel="noopener noreferrer"
                         className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                        <FileText size={11} /> PDF
                      </a>
                      <button onClick={() => revoke(p.token)} disabled={busy}
                              className="text-[11px] text-slate-500 hover:text-red-400 inline-flex items-center gap-1 disabled:opacity-60">
                        <X size={11} /> Withdraw
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {live.length === 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">
                Not published. Only you can see this passport.
              </p>
              {/* Stated before the button, not after. Somebody should know
                  what becomes public before making it public. */}
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-xl">
                Publishing exposes this agent&rsquo;s name, reliability figures,
                session counts, halt decisions and alert history to anyone with
                the link. It does not expose your API keys, your task content or
                anything the agent processed. You can withdraw it at any time.
              </p>
            </div>
          )}

          <button onClick={publish} disabled={busy}
                  className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            {live.length > 0 ? 'Publish a fresh passport' : 'Publish'}
          </button>

          {live.length > 0 && (
            <p className="text-[11px] text-slate-600 mt-2 max-w-xl leading-relaxed">
              A published passport is frozen at the moment it was published, so
              a link cited somewhere keeps showing what was cited. Publishing
              again creates a second link rather than changing this one.
            </p>
          )}
        </>
      )}
    </div>
  )
}
