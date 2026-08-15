'use client'
// src/app/dashboard/studio/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fault Injection Studio — choose what to test, see what it actually does.
//
// WHY A PREVIEW AND NOT A RUN BUTTON
// "context_corruption" is a label until you see what it does to a prompt. A
// team deciding which faults should gate their pipeline is making a real
// engineering choice, and they cannot make it from six words in a dropdown.
//
// So the studio shows the exact text the agent would receive, then hands over
// the code that runs it. Nothing is executed here: no quota is spent, no agent
// is called, and a preview costs nobody anything — which is what makes it safe
// to explore.
//
// NARROWING IS SHOWN AS A COST
// Restricting fault types is useful, and it is a real reduction in coverage.
// The banner says so plainly rather than letting a green result from two fault
// types read like a green result from six.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Beaker, ArrowLeft, Copy, Check, RefreshCw, AlertTriangle, Loader2,
  ChevronDown, ChevronRight,
} from 'lucide-react'

const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

interface Scenario {
  index: number
  domain: string
  fault_type: string
  is_nominal: boolean
  prompt: string
}

interface Preview {
  ok: boolean
  n_scenarios: number
  seed: number | null
  scenarios: Scenario[]
  counts: Record<string, number>
  available: { fault_types: string[]; domains: string[] }
  unknown_selections: string[]
  narrowed: boolean
  coverage_note: string
}

// What each fault actually simulates, in the words an engineer would use.
// Kept here rather than fetched because it is explanation, not data — and a
// tooltip that needs a round trip is a tooltip nobody reads.
const FAULT_MEANING: Record<string, string> = {
  tool_failure: 'A dependency goes offline. The agent must work from what it already has.',
  context_corruption: 'Data arrives conflicting or wrong. The agent must notice rather than trust it.',
  stochastic: 'Noise with no real signal. The agent must not overreact to nothing.',
  adversarial: 'Pressure to skip verification. The agent must hold its standards under it.',
  cascade: 'Primary fails, backup degrades. Failures compound rather than arrive alone.',
  combined: 'Several faults at once, which is what production actually looks like.',
}

const FAULT_COLOUR: Record<string, string> = {
  tool_failure: '#f87171',
  context_corruption: '#fbbf24',
  stochastic: '#60a5fa',
  adversarial: '#a78bfa',
  cascade: '#fb923c',
  combined: '#f472b6',
  none: '#34d399',
}

export default function StudioPage() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [faults, setFaults] = useState<string[]>([])
  const [domains, setDomains] = useState<string[]>([])
  const [count, setCount] = useState(18)
  const [seed, setSeed] = useState(42)
  const [question, setQuestion] = useState('')
  const [expanded, setExpanded] = useState<number | null>(0)
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${GATEWAY}/api/v1/battery/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n_scenarios: count,
          seed,
          fault_types: faults.length ? faults : null,
          domains: domains.length ? domains : null,
          question: question.trim() || null,
        }),
      })
      if (!res.ok) throw new Error(`Gateway returned ${res.status}`)

      // Checked before it is trusted. A response missing `scenarios` is not a
      // preview, and rendering it would throw inside the component rather than
      // here — which reaches the visitor as a blank "application error" with no
      // indication that the Gateway was the problem.
      //
      // A Gateway older than 2.7.0 predates this endpoint and can answer 200
      // with a different shape, so a status check alone is not enough.
      const data = await res.json()
      if (!data || !Array.isArray(data.scenarios)) {
        throw new Error(
          'The Gateway responded, but not with a battery preview. It may be '
          + 'running a version older than 2.7.0.',
        )
      }
      setPreview(data)
      setError('')
    } catch (err) {
      // Said plainly. An empty panel that looks like "no faults exist" would
      // send someone hunting for a configuration problem that is not theirs.
      setError(err instanceof Error ? err.message : 'Could not reach the Gateway.')
    } finally {
      setLoading(false)
    }
  }, [count, seed, faults, domains, question])

  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      // Clipboard access can fail on an insecure context or an older browser.
      // The snippet is on screen and selectable, so failing quietly beats an
      // error nobody can act on.
    }
  }

  const sdkSnippet = `from hb_eval_sdk import HBEvalClient

client = HBEvalClient(api_key=..., aes_key=..., signing_secret=...)

report = client.evaluate_with_battery(
    {"system": "...", "question": ${JSON.stringify(question.trim() || 'your task')}},
    my_agent,
    n_scenarios=${count},
    seed=${seed},${faults.length ? `\n    fault_types=${JSON.stringify(faults)},` : ''}${domains.length ? `\n    domains=${JSON.stringify(domains)},` : ''}
)
print(report["verdict"], report["metrics"])`

  const ciSnippet = `- uses: hb-evalSystem/hb-eval-sdk@v2.9.0
  env:
    HBEVAL_API_KEY: \${{ secrets.HBEVAL_API_KEY }}
    HBEVAL_AES_KEY: \${{ secrets.HBEVAL_AES_KEY }}
    HBEVAL_SIGNING_SECRET: \${{ secrets.HBEVAL_SIGNING_SECRET }}
  with:
    agent: 'myapp.agent:run'
    task: '.hbeval/task.json'
    scenarios: '${count}'
    seed: '${seed}'
    enforce: false      # start here, then tune`

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">

        <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-5">
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 mb-1">
          <Beaker size={22} className="text-purple-400" /> Fault Injection Studio
        </h1>
        <p className="text-sm text-slate-400 mb-6 max-w-2xl leading-relaxed">
          Choose which faults to test an agent against, and see the exact text
          it would receive. Nothing runs here — no agent is called and no quota
          is spent, so explore freely.
        </p>

        {error && (
          <div className="card p-4 mb-6 flex items-start gap-2.5"
               style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <p className="text-xs text-slate-500 mt-1">
                The preview endpoint needs no credentials, so this is a
                connectivity problem rather than a permissions one.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">

          {/* ── Selection ── */}
          <div className="space-y-4">
            <div className="card p-4">
              <p className="text-xs text-slate-400 mb-2.5">
                Fault types
                <span className="text-slate-600"> · none selected = all</span>
              </p>
              <div className="space-y-1.5">
                {(preview?.available?.fault_types ?? Object.keys(FAULT_MEANING)).map(f => {
                  const on = faults.includes(f)
                  return (
                    <button key={f} onClick={() => toggle(faults, setFaults, f)}
                            className="w-full text-left px-2.5 py-2 rounded-lg transition-colors"
                            style={{
                              background: on ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${on ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                      <span className="text-[13px] font-medium"
                            style={{ color: on ? '#ddd6fe' : '#cbd5e1' }}>
                        {f.replace(/_/g, ' ')}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {FAULT_MEANING[f] ?? ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card p-4">
              <p className="text-xs text-slate-400 mb-2">
                Domains<span className="text-slate-600"> · none = all</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(preview?.available?.domains ?? []).map(d => {
                  const on = domains.includes(d)
                  return (
                    <button key={d} onClick={() => toggle(domains, setDomains, d)}
                            className="px-2 py-1 rounded text-[11px] transition-colors"
                            style={{
                              background: on ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${on ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                              color: on ? '#6ee7b7' : '#94a3b8',
                            }}>
                      {d.replace(/_/g, ' ')}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Scenarios <span className="text-slate-200">{count}</span>
                </label>
                <input type="range" min={6} max={60} value={count}
                       onChange={e => setCount(Number(e.target.value))}
                       className="w-full" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Seed
                  <span className="text-slate-600"> · same seed, same battery</span>
                </label>
                <input type="number" value={seed}
                       onChange={e => setSeed(Number(e.target.value))}
                       className="w-full text-sm rounded-lg px-2.5 py-1.5"
                       style={{ background: 'rgba(0,0,0,0.25)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#e2e8f0' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Your task <span className="text-slate-600">· optional</span>
                </label>
                <textarea value={question} onChange={e => setQuestion(e.target.value)}
                          rows={3} maxLength={500}
                          placeholder="A shipment is three days late…"
                          className="w-full text-xs rounded-lg px-2.5 py-2 resize-none"
                          style={{ background: 'rgba(0,0,0,0.25)',
                                   border: '1px solid rgba(255,255,255,0.08)',
                                   color: '#e2e8f0' }} />
              </div>
              <button onClick={load} disabled={loading}
                      className="btn-primary text-xs w-full py-2 inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                {loading ? <Loader2 size={13} className="animate-spin" />
                         : <RefreshCw size={13} />}
                Preview
              </button>
            </div>
          </div>

          {/* ── Result ── */}
          <div className="space-y-4 min-w-0">
            {preview && (
              <>
                {/* Narrowing is a cost, and it is stated as one. A green result
                    from two fault types must not read like a green result from
                    six. */}
                {preview.narrowed && (
                  <div className="card p-3 flex items-start gap-2"
                       style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {preview.coverage_note}
                    </p>
                  </div>
                )}

                {(preview.unknown_selections?.length ?? 0) > 0 && (
                  <div className="card p-3">
                    <p className="text-xs text-red-300">
                      Not recognised and ignored:{' '}
                      <span className="font-mono">
                        {(preview.unknown_selections ?? []).join(', ')}
                      </span>
                    </p>
                  </div>
                )}

                <div className="card p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm text-white font-semibold">
                      {preview.n_scenarios} scenarios
                    </span>
                    <span className="text-[11px] text-slate-500">
                      seed {preview.seed ?? 'random'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(preview.counts ?? {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, n]) => (
                        <span key={type}
                              className="text-[11px] px-2 py-0.5 rounded"
                              style={{
                                background: `${FAULT_COLOUR[type] ?? '#64748b'}22`,
                                color: FAULT_COLOUR[type] ?? '#94a3b8',
                              }}>
                          {type.replace(/_/g, ' ')} × {n}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="card overflow-hidden">
                  <p className="text-xs text-slate-400 px-4 py-2.5"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    What the agent receives
                  </p>
                  <div>
                    {(preview.scenarios ?? []).map(s => {
                      const open = expanded === s.index
                      return (
                        <div key={s.index}
                             style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <button onClick={() => setExpanded(open ? null : s.index)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-white/[0.02] transition-colors">
                            {open ? <ChevronDown size={13} className="text-slate-500 shrink-0" />
                                  : <ChevronRight size={13} className="text-slate-500 shrink-0" />}
                            <span className="text-[11px] px-1.5 py-0.5 rounded shrink-0"
                                  style={{
                                    background: `${FAULT_COLOUR[s.fault_type] ?? '#64748b'}22`,
                                    color: FAULT_COLOUR[s.fault_type] ?? '#94a3b8',
                                  }}>
                              {s.is_nominal ? 'nominal' : s.fault_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] text-slate-500 shrink-0">
                              {s.domain.replace(/_/g, ' ')}
                            </span>
                          </button>
                          {open && (
                            <pre className="text-[12px] font-mono text-slate-300 whitespace-pre-wrap px-4 pb-3 leading-relaxed">
{s.prompt}
                            </pre>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* The point of the studio: leave with the code, not a
                    screenshot. */}
                {[
                  { key: 'sdk', label: 'Run this battery', code: sdkSnippet, lang: 'python' },
                  { key: 'ci', label: 'Gate a pull request on it', code: ciSnippet, lang: 'yaml' },
                ].map(({ key, label, code, lang }) => (
                  <div key={key} className="card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2"
                         style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs text-slate-300">{label}</span>
                      <button onClick={() => copy(code, key)}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200">
                        {copied === key ? <Check size={11} /> : <Copy size={11} />}
                        {copied === key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-4 text-[12px] font-mono text-slate-300 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.25)' }}>{code}</pre>
                    <p className="text-[11px] text-slate-600 px-4 pb-3">
                      {lang === 'yaml'
                        ? 'Starts in warn mode. Measure your own variance before enforcing.'
                        : 'The same seed reproduces this exact battery.'}
                    </p>
                  </div>
                ))}
              </>
            )}

            {loading && !preview && (
              <div className="card p-8 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-500" size={22} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
