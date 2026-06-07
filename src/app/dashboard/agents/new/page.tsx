'use client'
// app/dashboard/agents/new/page.tsx
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Create a new agent via the secure server endpoint /api/agents/provision.
// The browser never generates or sees the master key. On success the server
// returns the three credentials ONCE; we display them with a clear, Stripe-style
// "save these now â€” they will not be shown again" warning, and block navigation
// until the user confirms they have saved them.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Bot, Sparkles, Copy, Check, AlertTriangle, KeyRound,
} from 'lucide-react'

interface Credentials { api_key: string; aes_key: string; signing_secret: string }
interface CreatedAgent { id: string; name: string; agent_id: string }

export default function NewAgentPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agentIdCustom, setAgentIdCustom] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // After success:
  const [creds, setCreds] = useState<Credentials | null>(null)
  const [agent, setAgent] = useState<CreatedAgent | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<string>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/agents/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          agent_id: agentIdCustom.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not create the agent.'); setLoading(false); return }
      setCreds(data.credentials)
      setAgent(data.agent)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(''), 1500)
  }

  // â”€â”€ Success view: show the three credentials exactly once â”€â”€
  if (creds && agent) {
    const rows: { label: string; key: keyof Credentials; hint: string }[] = [
      { label: 'API Key',        key: 'api_key',        hint: 'Identifies your agent.' },
      { label: 'AES Key',        key: 'aes_key',        hint: 'Encrypts your payloads.' },
      { label: 'Signing Secret', key: 'signing_secret', hint: 'Signs your requests.' },
    ]
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <KeyRound size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agent created â€” save your keys</h1>
            <p className="text-slate-500 text-sm">{agent.name} Â· <span className="font-mono">{agent.agent_id}</span></p>
          </div>
        </div>

        {/* One-time warning */}
        <div className="flex items-start gap-3 text-sm text-amber-300 bg-amber-400/08 border border-amber-400/25 rounded-lg p-4 mb-6">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">These secrets are shown only once.</p>
            <p className="text-amber-300/80 leading-relaxed">
              The AES key and signing secret cannot be retrieved later â€” they are
              stored encrypted and never displayed again. Copy all three into a
              safe place now. If you lose them, you can rotate the agent's keys.
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {rows.map(r => (
            <div key={r.key} className="card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white">{r.label}</span>
                <button onClick={() => copy(r.label, creds[r.key])}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  {copied === r.label ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-300 bg-black/30 rounded p-2.5 break-all">
                {creds[r.key]}
              </code>
              <p className="text-xs text-slate-600 mt-1">{r.hint}</p>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300 mb-5 cursor-pointer select-none">
          <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />
          I have saved all three credentials in a secure place.
        </label>

        <button disabled={!saved}
                onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                className="btn-primary">
          Continue to agent
        </button>
      </div>
    )
  }

  // â”€â”€ Create form â”€â”€
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
          <p className="text-slate-500 text-sm">Each agent gets its own three credentials and usage quota.</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              Agent name <span className="text-red-400">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
                   required placeholder="e.g. Customer Support Agent" maxLength={80} />
            <p className="text-xs text-slate-600 mt-1">A human-readable name to identify this agent.</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
                      rows={3} placeholder="What does this agent do? (optional)" maxLength={300} />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              Agent ID <span className="ml-2 text-xs text-slate-600">(optional â€” auto-generated if blank)</span>
            </label>
            <input type="text" value={agentIdCustom} onChange={e => setAgentIdCustom(e.target.value)}
                   placeholder="e.g. support-agent-v2"
                   pattern="[a-zA-Z0-9\-_]+" title="Letters, numbers, hyphens and underscores only" />
            <p className="text-xs text-slate-600 mt-1">
              The <code className="code-inline">agent_id</code> you pass in evaluate() payloads. Unique per account.
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
              {loading ? 'Creatingâ€¦' : 'Create agent'}
            </button>
            <Link href="/dashboard/agents" className="btn-secondary text-sm">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
