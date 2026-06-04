// app/dashboard/page.tsx  — Server Component
// Fetches the user's agents and recent evaluations server-side,
// then passes them to client sub-components for rendering.
// Because this is a Server Component, there is no loading flash —
// the data is already in the HTML when it reaches the browser.
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bot, Plus, TrendingUp, Activity, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface Agent {
  id: string
  name: string
  agent_id: string
  plan_type: string
  evaluation_limit: number
  evaluations_this_month: number
  created_at: string
}

interface Evaluation {
  id: string
  verdict: string
  pei_score: number
  irs_score: number
  frr_score: number
  ti_score: number | null
  csi_score: number | null
  created_at: string
  agent_id: string  // UUID of the agent row
}

// ── Stat card component ────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent = false
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-5" style={accent ? { borderColor: 'rgba(37,99,235,0.25)' } : {}}>
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all the user's agents
  const { data: agents = [] } = await supabase
    .from('agents')
    .select('id, name, agent_id, plan_type, evaluation_limit, evaluations_this_month, created_at')
    .order('created_at', { ascending: false }) as { data: Agent[] }

  // Fetch the 20 most recent evaluations across all agents owned by this user
  const agentIds = agents.map(a => a.id)
  let evaluations: Evaluation[] = []

  if (agentIds.length > 0) {
    const { data } = await supabase
      .from('evaluations')
      .select('id, verdict, pei_score, irs_score, frr_score, ti_score, csi_score, created_at, project_id')
      .in('project_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(20)
    evaluations = (data || []).map(e => ({ ...e, agent_id: e.project_id }))
  }

  // Derived statistics
  const totalEvals    = agents.reduce((s, a) => s + a.evaluations_this_month, 0)
  const totalLimit    = agents.reduce((s, a) => s + a.evaluation_limit, 0)
  const safeCount     = evaluations.filter(e => e.verdict === 'SAFE').length
  const safeRate      = evaluations.length > 0 ? Math.round(safeCount / evaluations.length * 100) : 0
  const avgPei        = evaluations.length > 0
    ? (evaluations.reduce((s, e) => s + (e.pei_score || 0), 0) / evaluations.length).toFixed(3)
    : '—'

  const displayName   = user?.user_metadata?.full_name || 'there'

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Good day, {displayName} 👋</h1>
          <p className="text-slate-500 text-sm">
            {agents.length === 0
              ? 'Create your first agent to start evaluating.'
              : `You have ${agents.length} agent${agents.length > 1 ? 's' : ''} running.`}
          </p>
        </div>
        <Link href="/dashboard/agents/new" className="btn-primary text-sm">
          <Plus size={15} /> New Agent
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Agents"         value={agents.length}             accent />
        <StatCard label="Evals This Month"       value={totalEvals}               sub={`of ${totalLimit} limit`} />
        <StatCard label="SAFE Rate (last 20)"    value={`${safeRate}%`}           sub={`${safeCount} / ${evaluations.length} runs`} />
        <StatCard label="Avg PEI (last 20)"      value={avgPei} />
      </div>

      {/* Two-column layout: agents list + recent evaluations */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Agents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bot size={16} className="text-blue-400" /> My Agents
            </h2>
            <Link href="/dashboard/agents"
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {agents.length === 0 ? (
            <div className="card p-8 text-center">
              <Bot size={28} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">No agents yet.</p>
              <Link href="/dashboard/agents/new" className="btn-primary text-sm">
                <Plus size={14} /> Create first agent
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.slice(0, 5).map(agent => (
                <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}
                      className="card p-4 flex items-center justify-between group hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <Bot size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{agent.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{agent.agent_id}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      {agent.evaluations_this_month} / {agent.evaluation_limit}
                    </div>
                    <div className="text-xs text-slate-600">evals this month</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent evaluations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" /> Recent Evaluations
            </h2>
          </div>

          {evaluations.length === 0 ? (
            <div className="card p-8 text-center">
              <TrendingUp size={28} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No evaluations yet.</p>
              <p className="text-slate-600 text-xs mt-1">
                Call <code className="code-inline">client.evaluate()</code> to see results here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluations.map(ev => {
                const agent = agents.find(a => a.id === ev.agent_id)
                return (
                  <div key={ev.id} className="card px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {ev.verdict === 'SAFE'
                        ? <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                        : <XCircle    size={14} className="text-red-400     shrink-0" />}
                      <div>
                        <div className="text-xs font-medium text-white">{agent?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-600">
                          {new Date(ev.created_at).toLocaleString('en', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-500">PEI {(ev.pei_score || 0).toFixed(2)}</span>
                      <span className="text-slate-500">IRS {(ev.irs_score || 0).toFixed(2)}</span>
                      <span className={ev.verdict === 'SAFE' ? 'badge-safe' : 'badge-unsafe'}>
                        {ev.verdict}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
