'use client'
// app/dashboard/agents/[agentId]/page.tsx
// This is the most important page in the dashboard — it shows everything
// about a single agent: its API key, usage quota, evaluation history,
// metric trends, and certification status.
// It is a Client Component because of the copy-to-clipboard API key interaction.
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bot, Copy, Check, Eye, EyeOff, ArrowLeft, Activity,
  Shield, TrendingUp, AlertCircle, CheckCircle, XCircle,
  Zap, Brain, BarChart2, Clock, Database, HelpCircle,
  Lightbulb, Loader2, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────
interface Agent {
  id: string; name: string; description: string; agent_id: string
  api_key: string; plan_type: string; evaluation_limit: number
  evaluations_this_month: number; created_at: string
}
interface Evaluation {
  id: string; verdict: string
  pei_score: number; irs_score: number; frr_score: number
  ti_score: number | null; csi_score: number | null
  created_at: string
}

// ── EDM Layer 1 — selective-storage governance thresholds ───────────────────
// These mirror the Gateway's edm_guard exactly (PEI>=0.80 AND TI>=4.0). An
// evaluation is consolidated into the certified memory IFF it clears BOTH.
// We derive the badge straight from the row's metrics — no extra query needed,
// because the guard's rule is fully determined by PEI and TI.
const EDM_PEI_THRESHOLD = 0.80
const EDM_TI_THRESHOLD = 4.0

function memoryStatus(pei: number | null, ti: number | null): {
  stored: boolean; label: string; reason: string
} {
  const hasBoth = pei !== null && ti !== null
  const stored = hasBoth && pei >= EDM_PEI_THRESHOLD && ti >= EDM_TI_THRESHOLD
  if (stored) {
    return { stored: true, label: 'Stored', reason: 'Met PEI ≥ 0.80 and TI ≥ 4.0 — consolidated to certified memory.' }
  }
  if (!hasBoth) {
    return { stored: false, label: 'Not stored', reason: 'Missing PEI or TI — cannot qualify for certified memory.' }
  }
  const fails: string[] = []
  if (pei! < EDM_PEI_THRESHOLD) fails.push(`PEI ${pei!.toFixed(2)} < 0.80`)
  if (ti! < EDM_TI_THRESHOLD) fails.push(`TI ${ti!.toFixed(1)} < 4.0`)
  return { stored: false, label: 'Not stored', reason: `Below quality threshold: ${fails.join(', ')}.` }
}

// Build the compact plan summary the Gateway expects, mirroring edm_guard's
// _build_summary shape so explanations are grounded against comparable text.
function planSummaryFor(ev: Evaluation): string {
  return `domain=unspecified; pei=${ev.pei_score}; ti=${ev.ti_score ?? 'n/a'}; verdict=${ev.verdict}`
}


function MetricBar({
  label, icon: Icon, value, tier2, color
}: { label: string; icon: any; value: number | null; tier2: number; color: string }) {
  if (value === null) return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-mono font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="text-slate-600 text-xs">Insufficient data</div>
    </div>
  )

  const pct = Math.min(value / (label === 'TI' ? 5 : 1) * 100, 100)
  const meetsT2 = label === 'TI' ? value >= tier2 : value >= tier2
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-xs font-mono font-bold" style={{ color }}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white font-mono">
            {label === 'TI' ? value.toFixed(1) : value.toFixed(3)}
          </span>
          {meetsT2
            ? <CheckCircle size={12} className="text-emerald-400" />
            : <AlertCircle size={12} className="text-amber-400" />}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/08 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>0</span>
        <span className="text-slate-500">T2: {label === 'TI' ? `${tier2}.0` : `${tier2}`}</span>
        <span>{label === 'TI' ? '5' : '1'}</span>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [agent,        setAgent]        = useState<Agent | null>(null)
  const [evaluations,  setEvaluations]  = useState<Evaluation[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showKey,      setShowKey]      = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [renaming,     setRenaming]     = useState(false)
  const [newName,      setNewName]      = useState('')

  // Layer 2 (HCI-EDM) explanation state
  const [explainFor,   setExplainFor]   = useState<string | null>(null)  // evaluation id being explained
  const [explainData,  setExplainData]  = useState<any>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase
        .from('agents')
        // SECURITY: explicit safe columns only — never select('*'), which would
        // pull aes_key_encrypted / hmac_secret_encrypted into the browser.
        // Those ciphertexts are useless without the master key, but secrets
        // (even encrypted) must never reach the client.
        .select('id, name, description, agent_id, api_key, plan_type, evaluation_limit, evaluations_this_month, is_active, created_at')
        .eq('id', agentId)
        .single()

      if (!agentData) { router.push('/dashboard/agents'); return }

      const { data: evals } = await supabase
        .from('evaluations')
        .select('id, verdict, pei_score, irs_score, frr_score, ti_score, csi_score, created_at')
        .eq('project_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100)

      setAgent(agentData)
      setEvaluations(evals || [])
      setNewName(agentData.name)
      setLoading(false)
    }
    load()
  }, [agentId])

  async function copyKey() {
    if (!agent) return
    await navigator.clipboard.writeText(agent.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveRename() {
    if (!agent || !newName.trim()) return
    await supabase.from('agents').update({ name: newName.trim() }).eq('id', agent.id)
    setAgent({ ...agent, name: newName.trim() })
    setRenaming(false)
  }

  // Layer 2 — ask the performance-grounded interpreter why this verdict stands.
  // The browser never signs anything: it calls our server route, which decrypts
  // the agent secrets and relays a signed request to the Gateway.
  async function requestExplanation(ev: Evaluation) {
    if (!agent) return
    // Toggle off if the same row is clicked again.
    if (explainFor === ev.id) {
      setExplainFor(null); setExplainData(null); setExplainError(null)
      return
    }
    setExplainFor(ev.id)
    setExplainData(null)
    setExplainError(null)
    setExplainLoading(true)
    try {
      const res = await fetch('/api/agents/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_row_id: agent.id, plan_summary: planSummaryFor(ev) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setExplainError(data?.error || 'Could not load explanation.')
      } else {
        setExplainData(data)
      }
    } catch {
      setExplainError('Could not reach the explanation service.')
    } finally {
      setExplainLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!agent) return null

  // Computed averages over last 100 runs
  const n     = evaluations.length
  const safe  = evaluations.filter(e => e.verdict === 'SAFE').length
  const avg   = (key: keyof Evaluation) => n > 0
    ? evaluations.reduce((s, e) => s + ((e[key] as number) || 0), 0) / n
    : null
  const avgPei = avg('pei_score')
  const avgIrs = avg('irs_score')
  const avgFrr = avg('frr_score')
  const avgTi  = avg('ti_score')
  const avgCsi = avg('csi_score')
  const safeRate = n > 0 ? Math.round(safe / n * 100) : 0

  // Rough tier estimate
  const tierMet = (t: Record<string, number>) =>
    avgPei !== null && avgPei >= t.pei &&
    avgIrs !== null && avgIrs >= t.irs &&
    avgFrr !== null && avgFrr >= t.frr &&
    (avgTi  === null || avgTi  >= t.ti)  &&
    (avgCsi === null || avgCsi >= t.csi)

  const currentTier =
    n >= 100 && tierMet({ pei: 0.90, irs: 0.90, frr: 0.95, ti: 4.5, csi: 0.90 }) ? 3 :
    n >= 100 && tierMet({ pei: 0.80, irs: 0.75, frr: 0.85, ti: 4.0, csi: 0.80 }) ? 2 :
    n >= 100 && tierMet({ pei: 0.70, irs: 0.60, frr: 0.70, ti: 3.0, csi: 0.70 }) ? 1 :
    null

  return (
    <div className="max-w-5xl animate-fade-in">
      {/* Back link */}
      <Link href="/dashboard/agents"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
        <ArrowLeft size={14} /> All Agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Bot size={22} className="text-blue-400" />
          </div>
          <div>
            {renaming ? (
              <div className="flex items-center gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                       className="text-xl font-bold w-64" onKeyDown={e => e.key === 'Enter' && saveRename()} />
                <button onClick={saveRename}    className="btn-primary text-xs px-3 py-1">Save</button>
                <button onClick={() => setRenaming(false)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-white cursor-pointer hover:text-blue-300 transition-colors"
                  onClick={() => setRenaming(true)}>
                {agent.name}
              </h1>
            )}
            <div className="text-sm text-slate-500 font-mono mt-0.5">{agent.agent_id}</div>
          </div>
        </div>

        {/* Certification status */}
        <div className="card px-4 py-3 text-center">
          {currentTier ? (
            <>
              <div className="text-xs text-slate-500 mb-1">Certification</div>
              <div className="font-bold text-lg" style={{
                color: currentTier === 3 ? '#f59e0b' : currentTier === 2 ? '#7c3aed' : '#2563eb'
              }}>
                Tier {currentTier}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {currentTier === 1 ? 'Supervised' : currentTier === 2 ? 'Prod + Oversight' : 'Autonomous'}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-500 mb-1">Certification</div>
              <Shield size={18} className="text-slate-600 mx-auto" />
              <div className="text-xs text-slate-600 mt-1">
                {n < 100 ? `${n} / 100 runs` : 'Below thresholds'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* API Key section */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            API Key
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowKey(!showKey)}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
              {showKey ? <><EyeOff size={12}/> Hide</> : <><Eye size={12}/> Show</>}
            </button>
            <button onClick={copyKey}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
              {copied ? <><Check size={12} className="text-emerald-400"/> Copied</> : <><Copy size={12}/> Copy</>}
            </button>
          </div>
        </div>

        <div className="font-mono text-sm rounded-lg px-4 py-3 overflow-x-auto"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-blue-400">
            {showKey ? agent.api_key : agent.api_key.slice(0, 12) + '•'.repeat(32)}
          </span>
        </div>

        <p className="text-xs text-slate-600 mt-2">
          Use this key as <code className="code-inline">api_key</code> in HBEvalClient.
          Never commit it to a public repository. Pass it via environment variable.
        </p>
      </div>

      {/* Usage */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-white text-sm mb-3">Monthly Usage</h2>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">{agent.evaluations_this_month} evaluations used</span>
          <span className="text-slate-500">{agent.evaluation_limit} limit</span>
        </div>
        <div className="h-2 rounded-full bg-white/08 overflow-hidden">
          <div className="h-full rounded-full transition-all"
               style={{
                 width: `${Math.min(agent.evaluations_this_month / agent.evaluation_limit * 100, 100)}%`,
                 background: agent.evaluations_this_month / agent.evaluation_limit > 0.8 ? '#ef4444' : '#2563eb',
               }} />
        </div>
        {agent.plan_type === 'free' && (
          <p className="text-xs text-slate-600 mt-2">
            Need more?{' '}
            <Link href="/pricing" className="text-blue-400 hover:text-blue-300">Upgrade to Pro</Link>
            {' '}for 10,000 evaluations/month plus Agent Passport.
          </p>
        )}
      </div>

      {/* Metric averages grid */}
      <div className="mb-6">
        <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-400" />
          Average Metrics
          <span className="text-slate-600 font-normal text-xs">(last {n} runs)</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricBar label="PEI" icon={BarChart2} value={avgPei} tier2={0.80} color="#3b82f6" />
          <MetricBar label="IRS" icon={Brain}     value={avgIrs} tier2={0.75} color="#7c3aed" />
          <MetricBar label="FRR" icon={Zap}       value={avgFrr} tier2={0.85} color="#10b981" />
          <MetricBar label="TI"  icon={Shield}    value={avgTi}  tier2={4.0}  color="#f59e0b" />
          <MetricBar label="CSI" icon={Clock}     value={avgCsi} tier2={0.80} color="#ec4899" />
        </div>
      </div>

      {/* Recent evaluations table */}
      <div>
        <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
          <Activity size={14} className="text-emerald-400" /> Evaluation History
          <span className="text-slate-600 font-normal text-xs">({n} total)</span>
        </h2>

        {/* Eval-Driven Memory (EDM) + HCI-EDM — the reliability memory layers */}
        {n > 0 && (
          <div className="card p-4 mb-3" style={{ borderColor: 'rgba(139,92,246,0.18)' }}>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="flex gap-2">
                <Database size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-200 font-medium mb-0.5">Quality-governed memory</div>
                  <p className="text-slate-500 leading-relaxed">
                    A run is consolidated into certified memory only when it clears
                    <span className="text-slate-400"> PEI ≥ 0.80 and TI ≥ 4.0</span> together.
                    The <span className="text-emerald-300">Memory</span> column shows that decision
                    transparently — the store stays clean of low-quality runs.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Lightbulb size={15} className="shrink-0 mt-0.5" style={{ color: '#c4b5fd' }} />
                <div>
                  <div className="text-slate-200 font-medium mb-0.5">Performance-grounded explanations</div>
                  <p className="text-slate-500 leading-relaxed">
                    <span style={{ color: '#c4b5fd' }}>Why?</span> grounds each verdict in a specific
                    certified episode and cites its real metrics — or, when no precedent qualifies,
                    it honestly defers to human review rather than inventing a rationale.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {n === 0 ? (
          <div className="card p-10 text-center">
            <Activity size={28} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No evaluations yet for this agent.</p>
            <p className="text-slate-600 text-xs mt-1">
              Use <code className="code-inline">agent_id="{agent.agent_id}"</code> in your payload.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {['Verdict', 'PEI', 'IRS', 'FRR', 'TI', 'CSI', 'When', 'Memory', 'Why'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluations.slice(0, 30).map((ev, i) => {
                  const mem = memoryStatus(ev.pei_score, ev.ti_score)
                  const isOpen = explainFor === ev.id
                  return (
                  <>
                  <tr key={ev.id}
                      className="border-b transition-colors hover:bg-white/02"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-2.5">
                      {ev.verdict === 'SAFE'
                        ? <span className="badge-safe flex items-center gap-1 w-fit"><CheckCircle size={10}/> SAFE</span>
                        : <span className="badge-unsafe flex items-center gap-1 w-fit"><XCircle size={10}/> UNSAFE</span>}
                    </td>
                    {(['pei_score','irs_score','frr_score','ti_score','csi_score'] as const).map(k => (
                      <td key={k} className="px-4 py-2.5 font-mono text-xs text-slate-400">
                        {ev[k] !== null ? (ev[k] as number).toFixed(k === 'ti_score' ? 1 : 3) : '—'}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {new Date(ev.created_at).toLocaleString('en', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    {/* Layer 1 — transparent EDM guard status (derived from PEI & TI) */}
                    <td className="px-4 py-2.5">
                      {mem.stored
                        ? <span title={mem.reason}
                                className="flex items-center gap-1 w-fit text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.10)', color: '#6ee7b7' }}>
                            <Database size={10}/> Stored
                          </span>
                        : <span title={mem.reason}
                                className="flex items-center gap-1 w-fit text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(148,163,184,0.10)', color: '#94a3b8' }}>
                            <X size={10}/> Not stored
                          </span>}
                    </td>
                    {/* Layer 2 — request a performance-grounded explanation */}
                    <td className="px-4 py-2.5">
                      <button onClick={() => requestExplanation(ev)}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
                              style={{
                                background: isOpen ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                                color: isOpen ? '#c4b5fd' : '#94a3b8',
                              }}>
                        <HelpCircle size={11}/> Why?
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ background: 'rgba(139,92,246,0.04)' }}>
                      <td colSpan={9} className="px-4 py-4">
                        {explainLoading && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Loader2 size={13} className="animate-spin"/> Grounding an explanation in certified memory…
                          </div>
                        )}
                        {!explainLoading && explainError && (
                          <div className="flex items-center gap-2 text-xs text-amber-400">
                            <AlertCircle size={13}/> {explainError}
                          </div>
                        )}
                        {!explainLoading && !explainError && explainData && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {explainData.grounded
                                ? <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#c4b5fd' }}>
                                    <Lightbulb size={12}/> Grounded explanation
                                  </span>
                                : <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                                    <HelpCircle size={12}/> Uncertain — human review advised
                                  </span>}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                              {explainData.explanation}
                            </p>
                            {explainData.grounded && explainData.cited_episode_id && (
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                                <span>episode {String(explainData.cited_episode_id).slice(0, 8)}…</span>
                                {typeof explainData.similarity === 'number' &&
                                  <span>similarity {explainData.similarity.toFixed(2)}</span>}
                                {explainData.evidence?.pei != null &&
                                  <span>PEI {Number(explainData.evidence.pei).toFixed(2)}</span>}
                                {explainData.evidence?.ti != null &&
                                  <span>TI {Number(explainData.evidence.ti).toFixed(1)}</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                )})}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
