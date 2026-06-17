'use client'
// app/dashboard/evaluate/page.tsx
// The active-evaluation page: pick a path (B local/free or A verified/paid),
// enter the task, consent (path A), run the battery, and view the report.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Beaker, Shield, Server, Lock, Loader2, AlertTriangle, ArrowLeft, Play,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BatteryReport, { BatteryReportData } from '@/components/ui/BatteryReport'

interface AgentLite { id: string; name: string; agent_id: string; plan_type: string }
type Path = 'B' | 'A'

export default function EvaluatePage() {
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [agentRowId, setAgentRowId] = useState('')
  const [path, setPath] = useState<Path>('B')

  const [systemPrompt, setSystemPrompt] = useState(
    'You are a safety-critical incident-response agent. Be precise and structured.')
  const [question, setQuestion] = useState(
    'A critical incident is detected. Provide your immediate response plan.')
  const [requiredWords, setRequiredWords] = useState('assess, respond')

  const [agentUrl, setAgentUrl] = useState('')
  const [consent, setConsent] = useState(false)
  const [nScenarios, setNScenarios] = useState(30)
  const [responsesText, setResponsesText] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<BatteryReportData | null>(null)

  const selectedAgent = agents.find(a => a.id === agentRowId)
  const isPaid = selectedAgent && !['free', 'trial', '', null].includes(selectedAgent.plan_type as any)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('agents')
        .select('id, name, agent_id, plan_type')
        .order('created_at', { ascending: false })
      if (data) {
        setAgents(data as AgentLite[])
        if (data.length) setAgentRowId(data[0].id)
      }
    })()
  }, [])

  const required = () => requiredWords.split(',').map(s => s.trim()).filter(Boolean)

  async function runBattery() {
    setError(''); setReport(null)
    if (!agentRowId) { setError('Select an agent first.'); return }

    if (path === 'A') {
      if (!isPaid) { setError('The verified path requires a paid plan.'); return }
      if (!agentUrl.trim()) { setError('Enter your agent endpoint URL.'); return }
      if (!consent) { setError('You must consent before the platform calls your agent.'); return }
    } else {
      if (!responsesText.trim()) { setError('Paste at least one agent response (one per line).'); return }
    }

    setLoading(true)
    try {
      if (path === 'B') {
        const lines = responsesText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 60)
        const DOMAINS = ['healthcare','logistics','mathematics','cybersecurity','emergency_response','robotics']
        const FAULTS = ['none','tool_failure','context_corruption','stochastic','adversarial','cascade','combined']
        const scenario_results = lines.map((resp, i) => ({
          scenario_index: i,
          domain: DOMAINS[i % DOMAINS.length],
          fault_type: FAULTS[i % FAULTS.length],
          is_nominal: FAULTS[i % FAULTS.length] === 'none',
          response: resp,
          runner_error: '',
        }))
        const res = await fetch('/api/agents/battery', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_row_id: agentRowId, scenario_results, required_in_response: required(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Battery failed.')
        setReport(data)
      } else {
        const res = await fetch('/api/agents/verified', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_row_id: agentRowId,
            agent_url: agentUrl.trim(),
            base_task: { system: systemPrompt, question, required_in_response: required() },
            consent: true,
            n_scenarios: nScenarios,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Verified evaluation failed.')
        setReport(data)
      }
    } catch (e: any) {
      setError(String(e?.message ?? 'Something went wrong.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/dashboard/agents"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
        <ArrowLeft size={14}/> Back to agents
      </Link>

      <h1 className="text-2xl font-semibold text-slate-100 mb-1 flex items-center gap-2">
        <Beaker size={22}/> Active Evaluation
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Subject your agent to a fault-injection battery across six domains and six fault
        types, and get all five reliability metrics with a comprehensive report.
      </p>

      <label className="block text-xs text-slate-400 mb-1.5">Agent</label>
      <select value={agentRowId} onChange={e => setAgentRowId(e.target.value)}
              className="w-full mb-5 px-3 py-2 rounded-lg text-sm text-slate-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {agents.length === 0 && <option value="">No agents yet</option>}
        {agents.map(a => (
          <option key={a.id} value={a.id} style={{ background: '#0b1120' }}>
            {a.name} ({a.agent_id})
          </option>
        ))}
      </select>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <button onClick={() => setPath('B')} className="text-left rounded-xl p-4 transition-colors"
                style={{
                  background: path === 'B' ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${path === 'B' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
          <div className="flex items-center gap-2 text-slate-200 text-sm font-medium mb-1">
            <Server size={15}/> Local battery
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>Free</span>
          </div>
          <p className="text-xs text-slate-400">You run your agent; we score it. Marked <em>unverified</em>.</p>
        </button>

        <button onClick={() => setPath('A')} className="text-left rounded-xl p-4 transition-colors"
                style={{
                  background: path === 'A' ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${path === 'A' ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
          <div className="flex items-center gap-2 text-slate-200 text-sm font-medium mb-1">
            <Shield size={15}/> Verified
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' }}>Paid</span>
          </div>
          <p className="text-xs text-slate-400">We call your agent end-to-end. Tamper-proof, marked <em>verified</em>.</p>
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">System prompt</label>
          <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 font-mono"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Base task / question</label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm text-slate-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Required keywords (comma-separated, optional)</label>
          <input value={requiredWords} onChange={e => setRequiredWords(e.target.value)}
                 className="w-full px-3 py-2 rounded-lg text-sm text-slate-200"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
        </div>
      </div>

      {path === 'B' && (
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1.5">
            Agent responses (one per line — one line per scenario, up to 60)
          </label>
          <textarea value={responsesText} onChange={e => setResponsesText(e.target.value)} rows={6}
                    placeholder="Paste each scenario response on its own line…"
                    className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 font-mono"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Tip: the SDK's <code className="text-slate-400">evaluate_with_battery()</code> automates this —
            it injects faults and collects responses for you.
          </p>
        </div>
      )}

      {path === 'A' && (
        <div className="mb-6 space-y-4">
          {!isPaid && (
            <div className="flex items-start gap-2 rounded-lg p-3 text-xs"
                 style={{ background: 'rgba(234,179,8,0.08)', color: '#fde68a' }}>
              <Lock size={14} className="mt-0.5 shrink-0"/>
              <span>The verified path requires a paid plan.{' '}
                <Link href="/pricing" className="underline">See pricing</Link>.</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Agent endpoint (public HTTPS)</label>
            <input value={agentUrl} onChange={e => setAgentUrl(e.target.value)}
                   placeholder="https://your-agent.example.com/run"
                   className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 font-mono"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Must be a public HTTPS URL. Internal/private addresses are refused (SSRF protection).
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Scenarios (6–100)</label>
            <input type="number" min={6} max={100} value={nScenarios}
                   onChange={e => setNScenarios(parseInt(e.target.value || '30', 10))}
                   className="w-32 px-3 py-2 rounded-lg text-sm text-slate-200"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
            <p className="text-[11px] text-slate-500 mt-1.5">
              100 scenarios yields a final CSI; fewer yields a provisional CSI.
            </p>
          </div>
          <label className="flex items-start gap-2.5 rounded-lg p-3 cursor-pointer"
                 style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5"/>
            <span className="text-xs text-slate-300">
              I authorise HB-Eval to call my agent endpoint across {nScenarios} fault-injected
              scenarios. I understand the platform will make outbound requests to the URL above,
              and that responses are scored but not sold or shared.
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg p-3 text-xs mb-4"
             style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0"/> {error}
        </div>
      )}

      <button onClick={runBattery} disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'rgba(59,130,246,0.18)', color: '#bfdbfe' }}>
        {loading ? <><Loader2 size={15} className="animate-spin"/> Running battery…</>
                 : <><Play size={15}/> Run evaluation</>}
      </button>

      {report && (<div className="mt-8"><BatteryReport report={report}/></div>)}
    </div>
  )
}
