'use client'
// app/dashboard/settings/ExportData.tsx
// "Download my data" button — calls /api/account/export and saves the JSON.
import { useState } from 'react'
import { Download } from 'lucide-react'

export default function ExportData() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleExport() {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) { setError('Could not export your data. Please try again.'); setLoading(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hbeval-my-data.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-white mb-0.5">Export your data</p>
          <p className="text-xs text-slate-500">Download all your account data, agents, and evaluations as JSON.</p>
        </div>
        <button onClick={handleExport} disabled={loading} className="btn-secondary text-sm">
          <Download size={14} /> {loading ? 'Preparing…' : 'Download'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  )
}
