'use client'
// app/dashboard/evaluate/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Two paths:
//   • Path B (local, free): the battery runs ON THE USER'S MACHINE via the SDK.
//     This page shows INSTRUCTIONS + ready-to-copy code — it does NOT ask the
//     user to paste responses. The SDK produces a JSON report file locally.
//   • Path A (verified, paid): the PLATFORM calls the user's public agent
//     endpoint across the battery (SSRF-guarded, consent required). Marked
//     `verified`; the report renders here with a Download button.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Beaker, Shield, Server, Lock, Loader2, AlertTriangle, ArrowLeft, Play,
  Copy, Check, Terminal,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BatteryReport, { BatteryReportData } from '@/components/ui/BatteryReport'

interface AgentLite { id: string; name: string; agent_id: string; plan_type: string }
type Path = 'B' | 'A'

export default function EvaluatePage() {
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [agentRowId, setAgentRowId] = useState('')
  const [path, setPath] = useState<Path>('B')
  // For the local path: which model the user wants to test. We generate a
  // ready-to-run snippet per provider. The user's MODEL key stays on their
  // machine — it is never sent to our platform.
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'anthropic' | 'langchain' | 'langgraph' | 'crewai' | 'custom'>('openai')

  const [systemPrompt, setSystemPrompt] = useState(
    'You are a safety-critical incident-response agent. Be precise and structured.')
  const [question, setQuestion] = useState(
    'A critical incident is detected. Provide your immediate response plan.')
  const [requiredWords, setRequiredWords] = useState('assess, respond')
  const [agentUrl, setAgentUrl] = useState('')
  const [consent, setConsent] = useState(false)
  const [nScenarios, setNScenarios] = useState(30)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<BatteryReportData | null>(null)
  const [copied, setCopied] = useState(false)

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

  // Per-provider ready-to-run templates. The HB-Eval client uses OUR three keys
  // (sent to the Gateway). The MODEL call uses the USER'S own provider key, which
  // stays entirely on their machine — it is never transmitted to HB-Eval.
  const PROVIDER_BLOCKS: Record<string, { install: string; agent: string }> = {
    openai: {
      install: 'pip install hb-eval-sdk openai',
      agent: `from openai import OpenAI
_model = OpenAI(api_key=os.environ["OPENAI_API_KEY"])  # your key stays local

def my_agent(system_prompt: str, question: str) -> str:
    r = _model.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": system_prompt},
                  {"role": "user", "content": question}],
    )
    return r.choices[0].message.content or ""`,
    },
    gemini: {
      install: 'pip install hb-eval-sdk google-generativeai',
      agent: `import google.generativeai as genai
genai.configure(api_key=os.environ["GEMINI_API_KEY"])  # your key stays local
_model = genai.GenerativeModel("gemini-2.5-flash")

def my_agent(system_prompt: str, question: str) -> str:
    r = _model.generate_content(f"{system_prompt}\\n\\n{question}")
    return r.text if hasattr(r, "text") else ""`,
    },
    anthropic: {
      install: 'pip install hb-eval-sdk anthropic',
      agent: `import anthropic
_model = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])  # stays local

def my_agent(system_prompt: str, question: str) -> str:
    r = _model.messages.create(
        model="claude-sonnet-4-6", max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": question}],
    )
    return "".join(b.text for b in r.content if hasattr(b, "text"))`,
    },
    langchain: {
      install: 'pip install hb-eval-sdk langchain',
      agent: `from hb_eval_sdk.langchain_integration import adapt_langchain_agent

# Your existing LangChain AgentExecutor (built elsewhere in your codebase)
# my_agent_executor = AgentExecutor(agent=..., tools=...)

my_agent = adapt_langchain_agent(my_agent_executor)`,
    },
    langgraph: {
      install: 'pip install hb-eval-sdk langgraph',
      agent: `from hb_eval_sdk.langgraph_integration import adapt_langgraph_agent

# Your existing compiled LangGraph graph
# my_compiled_graph = builder.compile()

my_agent = adapt_langgraph_agent(my_compiled_graph)`,
    },
    crewai: {
      install: 'pip install hb-eval-sdk crewai',
      agent: `from hb_eval_sdk.crewai_integration import adapt_crewai_agent

# Your existing CrewAI Agent
# my_crew_agent = Agent(role="...", goal="...", backstory="...", llm="...")

my_agent = adapt_crewai_agent(my_crew_agent)`,
    },
    custom: {
      install: 'pip install hb-eval-sdk',
      agent: `def my_agent(system_prompt: str, question: str) -> str:
    # Call YOUR model or agent here with your own key (it stays local),
    # and return the response text.
    ...`,
    },
  }

  const block = PROVIDER_BLOCKS[provider]
  const sdkSnippet = `# ${block.install}
import os, json
from hb_eval_sdk import HBEvalClient

# HB-Eval client uses YOUR THREE HB-Eval keys (from your agent's credentials).
client = HBEvalClient(
    api_key=os.environ["HBEVAL_API_KEY"],
    aes_key=os.environ["HBEVAL_AES_KEY"],
    signing_secret=os.environ["HBEVAL_SIGNING_SECRET"],
    gateway_url="https://hbeval-reliability-os-production.up.railway.app",
)

# Your model — its API key stays on YOUR machine, never sent to HB-Eval.
${block.agent}

base_task = {
    "system": "You are a safety-critical incident-response agent.",
    "question": "A critical incident is detected. Provide your response plan.",
    "required_in_response": ["assess", "respond"],
}

# Runs the fault-injection battery LOCALLY; scores server-side; saves a report.
report = client.evaluate_with_battery(base_task, my_agent, n_scenarios=18)

with open("hbeval_report.json", "w") as f:
    json.dump(report, f, indent=2)
print("Verdict:", report["verdict"], "| saved to hbeval_report.json")`

  function copySnippet() {
    try {
      navigator.clipboard.writeText(sdkSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked; manual select */ }
  }

  async function runVerified() {
    setError(''); setReport(null)
    if (!agentRowId) { setError('Select an agent first.'); return }
    if (!isPaid) { setError('The verified path requires a paid plan.'); return }
    if (!agentUrl.trim()) { setError('Enter your agent endpoint URL.'); return }
    if (!consent) { setError('You must consent before the platform calls your agent.'); return }

    setLoading(true)
    try {
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
        <button onClick={() => { setPath('B'); setReport(null); setError('') }}
                className="text-left rounded-xl p-4 transition-colors"
                style={{
                  background: path === 'B' ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${path === 'B' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
          <div className="flex items-center gap-2 text-slate-200 text-sm font-medium mb-1">
            <Server size={15}/> Local battery
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>Free</span>
          </div>
          <p className="text-xs text-slate-400">
            Run it yourself with the SDK. Your agent stays on your machine. Marked <em>unverified</em>.
          </p>
        </button>

        <button onClick={() => { setPath('A'); setReport(null); setError('') }}
                className="text-left rounded-xl p-4 transition-colors"
                style={{
                  background: path === 'A' ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${path === 'A' ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
          <div className="flex items-center gap-2 text-slate-200 text-sm font-medium mb-1">
            <Shield size={15}/> Verified
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' }}>Paid</span>
          </div>
          <p className="text-xs text-slate-400">
            We call your agent end-to-end. Tamper-proof, marked <em>verified</em>.
          </p>
        </button>
      </div>

      {path === 'B' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed"
               style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' }}>
            <div className="flex items-center gap-2 text-slate-200 font-medium mb-2">
              <Terminal size={15}/> How the local battery works
            </div>
            <p className="mb-2">
              The local battery runs on <strong>your</strong> machine through the SDK. It injects
              the six fault types across six domains, calls your agent for each scenario, and sends
              only the responses to the Gateway for scoring — your agent never leaves your environment.
            </p>
            <p className="mb-2 text-slate-300">
              <strong>No agent of your own?</strong> If you have an API key from OpenAI, Gemini, or
              Anthropic, pick it below and the snippet becomes a complete, runnable script — your
              model key stays on your machine and is never sent to HB-Eval.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Create an account and provision an agent to get your three HB-Eval keys.</li>
              <li>Set those three keys (and your model's key) as environment variables.</li>
              <li>Pick your model below, copy the snippet, and run it.</li>
              <li>You'll get a <code className="text-slate-300">hbeval_report.json</code> file locally.</li>
            </ol>
          </div>

          {/* Provider selector — generates a complete script for the chosen model */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Model to evaluate</label>
            <div className="flex flex-wrap gap-2">
              {([
                ['openai', 'OpenAI'],
                ['gemini', 'Gemini'],
                ['anthropic', 'Anthropic'],
                ['custom', 'My own agent'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setProvider(key)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{
                          background: provider === key ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${provider === key ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: provider === key ? '#bfdbfe' : '#cbd5e1',
                        }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Already have an agent built with a framework? Use its adapter directly. */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Or evaluate an existing framework agent
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                ['langchain', 'LangChain'],
                ['langgraph', 'LangGraph'],
                ['crewai', 'CrewAI'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setProvider(key)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{
                          background: provider === key ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${provider === key ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: provider === key ? '#ddd6fe' : '#cbd5e1',
                        }}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              One line adapts your existing agent — no manual wiring needed.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-4 py-2"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-xs text-slate-400">Python — local battery</span>
              <button onClick={copySnippet}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors">
                {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
              </button>
            </div>
            <pre className="px-4 py-3 text-xs text-slate-300 overflow-x-auto leading-relaxed"
                 style={{ background: 'rgba(0,0,0,0.25)' }}>
              <code>{sdkSnippet}</code>
            </pre>
          </div>

          <p className="text-[11px] text-slate-500">
            Local-path results are marked <em>unverified</em> — scored server-side, but the run
            executed in your environment. For a tamper-proof, platform-run evaluation, use the{' '}
            <button onClick={() => setPath('A')} className="underline text-slate-400">Verified path</button>.
          </p>
        </div>
      )}

      {path === 'A' && (
        <>
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

          {error && (
            <div className="flex items-start gap-2 rounded-lg p-3 text-xs mb-4"
                 style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0"/> {error}
            </div>
          )}

          <button onClick={runVerified} disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' }}>
            {loading ? <><Loader2 size={15} className="animate-spin"/> Running verified battery…</>
                     : <><Play size={15}/> Run verified evaluation</>}
          </button>

          {report && (<div className="mt-8"><BatteryReport report={report}/></div>)}
        </>
      )}
    </div>
  )
}
