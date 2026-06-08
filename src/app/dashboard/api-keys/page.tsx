// app/dashboard/api-keys/page.tsx — Server Component
// Lists every agent the user owns alongside its API key, with a link to the
// agent's detail page (where key rotation and the encrypted secrets workflow
// live). We deliberately SELECT only safe columns — never the *_encrypted
// columns — so ciphertext never reaches the browser.
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KeyRound, Bot, ArrowRight, Plus } from 'lucide-react'
import ApiKeyRow from './ApiKeyRow'

interface AgentRow {
  id: string
  name: string
  agent_id: string
  api_key: string
  plan_type: string
}

export default async function ApiKeysPage() {
  const supabase = createClient()
  const { data: agents = [] } = await supabase
    .from('agents')
    .select('id, name, agent_id, api_key, plan_type')
    .order('created_at', { ascending: false }) as { data: AgentRow[] }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <KeyRound size={22} className="text-blue-400" />
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed">
        Each agent has its own API key for identification. The AES key and signing
        secret are shown only once at creation and cannot be retrieved here — if
        you lost them, open an agent and rotate its keys to generate a new set.
      </p>

      {agents.length === 0 ? (
        <div className="card p-10 text-center">
          <Bot size={32} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-1">No agents yet</p>
          <p className="text-slate-600 text-sm mb-5">Create your first agent to get a set of credentials.</p>
          <Link href="/dashboard/agents/new" className="btn-primary text-sm">
            <Plus size={14} /> Create agent
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                    <Bot size={15} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">{a.agent_id}</div>
                  </div>
                </div>
                <Link href={`/dashboard/agents/${a.id}`}
                      className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 shrink-0">
                  Manage <ArrowRight size={12} />
                </Link>
              </div>
              <ApiKeyRow apiKey={a.api_key} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
