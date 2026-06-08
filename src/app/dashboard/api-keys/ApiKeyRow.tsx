'use client'
// app/dashboard/api-keys/ApiKeyRow.tsx
// Small client component: shows an API key masked by default, with reveal and
// copy actions. Kept separate so the parent page can stay a Server Component.
import { useState } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'

export default function ApiKeyRow({ apiKey }: { apiKey: string }) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)

  const masked = apiKey.slice(0, 12) + '•'.repeat(Math.max(0, apiKey.length - 12))

  function copy() {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs font-mono text-slate-300 bg-black/30 rounded p-2.5 break-all">
        {shown ? apiKey : masked}
      </code>
      <button onClick={() => setShown(s => !s)} aria-label={shown ? 'Hide key' : 'Show key'}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/05">
        {shown ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button onClick={copy} aria-label="Copy key"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/05">
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  )
}
