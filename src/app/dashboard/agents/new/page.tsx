'use client'
// app/dashboard/agents/new/page.tsx
// Form to create a new agent. On submit, inserts a row into the `agents`
// table. Supabase's BEFORE INSERT trigger automatically generates the
// api_key and agent_id, so we only need to collect name and description.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bot, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewAgentPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [agentIdCustom, setAgentIdCustom] = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Not authenticated.'); setLoading(false); return }

    const row: any = {
      user_id: userData.user.id,
      name:    name.trim(),
      description: description.trim(),
    }
    // If a custom agent_id was provided, use it; otherwise the trigger generates one.
    if (agentIdCustom.trim()) row.agent_id = agentIdCustom.trim()

    const { data, error } = await supabase.from('agents').insert(row).select('id').single()
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/dashboard/agents/${data.id}`)
    }
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <Link href="/dashboard/agents"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Bot size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">New Agent</h1>
          <p className="text-slate-500 text-sm">Each agent gets its own API key and usage quota.</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              Agent name <span className="text-red-400">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
                   required placeholder="e.g. Customer Support Agent"
                   maxLength={80} />
            <p className="text-xs text-slate-600 mt-1">A human-readable name to identify this agent in the dashboard.</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
                      rows={3} placeholder="What does this agent do? (optional)"
                      maxLength={300} />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              Agent ID
              <span className="ml-2 text-xs text-slate-600">(optional — auto-generated if blank)</span>
            </label>
            <input type="text" value={agentIdCustom} onChange={e => setAgentIdCustom(e.target.value)}
                   placeholder="e.g. support-agent-v2"
                   pattern="[a-zA-Z0-9\-_]+" title="Letters, numbers, hyphens and underscores only" />
            <p className="text-xs text-slate-600 mt-1">
              This is the <code className="code-inline">agent_id</code> you pass in evaluate() payloads.
              Must be unique across your account.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/08 border border-red-400/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary">
              <Sparkles size={14} />
              {loading ? 'Creating…' : 'Create agent'}
            </button>
            <Link href="/dashboard/agents" className="btn-secondary text-sm">Cancel</Link>
          </div>
        </form>
      </div>

      {/* Hint box */}
      <div className="mt-5 card p-4" style={{ borderColor: 'rgba(37,99,235,0.15)' }}>
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-blue-400 font-medium">After creating:</span>{' '}
          your API key will be shown on the agent detail page.
          You can have as many agents as you need — one for each project,
          team, or deployment environment.
        </p>
      </div>
    </div>
  )
}
