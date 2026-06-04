// app/dashboard/agents/page.tsx — Server Component
// Lists all agents belonging to the authenticated user.
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bot, Plus, ArrowRight, Activity } from 'lucide-react'

export default async function AgentsPage() {
  const supabase = createClient()

  const { data: agents = [] } = await supabase
    .from('agents')
    .select('id, name, description, agent_id, plan_type, evaluation_limit, evaluations_this_month, created_at, is_active')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Agents</h1>
          <p className="text-slate-500 text-sm">
            Each agent has its own API key, usage quota, and evaluation history.
            You can have multiple agents — one per project or per deployment environment.
          </p>
        </div>
        <Link href="/dashboard/agents/new" className="btn-primary text-sm">
          <Plus size={15} /> New Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="card p-16 text-center">
          <Bot size={40} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No agents yet</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Create your first agent to get an API key and start sending evaluations.
            Your Supabase trigger should have created one automatically when you registered —
            check again or create a new one below.
          </p>
          <Link href="/dashboard/agents/new" className="btn-primary text-sm">
            <Plus size={14} /> Create first agent
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent: any) => {
            const usagePercent = Math.round(agent.evaluations_this_month / agent.evaluation_limit * 100)
            return (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}
                    className="card p-5 flex items-center justify-between group">
                {/* Left: identity */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center
                                  group-hover:bg-blue-500/25 transition-colors">
                    <Bot size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{agent.agent_id}</div>
                    {agent.description && (
                      <div className="text-xs text-slate-600 mt-1 max-w-sm truncate">{agent.description}</div>
                    )}
                  </div>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-6 text-sm">
                  {/* Usage bar */}
                  <div className="hidden sm:block w-28">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{agent.evaluations_this_month} used</span>
                      <span>{agent.evaluation_limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/08 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                           style={{
                             width: `${Math.min(usagePercent, 100)}%`,
                             background: usagePercent > 80 ? '#ef4444' : '#2563eb',
                           }} />
                    </div>
                  </div>

                  {/* Plan badge */}
                  <span className={`text-xs px-2 py-1 rounded-full capitalize border ${
                    agent.plan_type === 'pro'        ? 'text-purple-400 border-purple-500/20 bg-purple-500/08' :
                    agent.plan_type === 'enterprise' ? 'text-amber-400  border-amber-500/20  bg-amber-500/08'  :
                                                       'text-slate-400  border-white/08      bg-white/04'
                  }`}>
                    {agent.plan_type}
                  </span>

                  <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
