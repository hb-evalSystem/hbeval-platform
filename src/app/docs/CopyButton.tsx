'use client'
// src/app/docs/CopyButton.tsx
//
// Isolated to its own tiny client component rather than making the whole docs
// page a client component. The page's content is static and benefits from
// server rendering (faster first paint, better for indexing); only this one
// button actually needs the browser.
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard access can fail (permissions, insecure context, older
      // browsers). Failing silently rather than throwing keeps the page
      // usable — the code is still visible and selectable by hand.
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy code"
      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
