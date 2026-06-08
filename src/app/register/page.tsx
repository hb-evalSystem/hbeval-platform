'use client'
// app/register/page.tsx
// Registration with REQUIRED legal consent. The user must tick acceptance of
// the Terms and Privacy Policy before the button enables. After sign-up we
// record the accepted legal version via /api/account/consent (best-effort; the
// version is also captured in user metadata so consent is never lost).
import { useState } from 'react'
import Link from 'next/link'
import { Shield, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const LEGAL_VERSION = '2026-06'   // bump when Terms/Privacy change materially

export default function RegisterPage() {
  const supabase = createClient()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [agreed,   setAgreed]   = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('Please accept the Terms and Privacy Policy to continue.'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, legal_version: LEGAL_VERSION, consented_at: new Date().toISOString() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Best-effort consent record (does not block on failure).
      try {
        await fetch('/api/account/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ legal_version: LEGAL_VERSION }),
        })
      } catch { /* metadata already carries the consent */ }
      setDone(true)
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-400/12 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Check your inbox</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account and access your dashboard.
          </p>
          <Link href="/login" className="btn-secondary text-sm">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37,99,235,0.12), transparent)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-semibold text-xl">
            <Shield size={24} className="text-blue-500" />
            HB-Eval <span className="text-blue-500">OS</span>
          </Link>
          <p className="text-slate-400 text-sm mt-2">Create your free account</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400 justify-center mb-6 flex-wrap">
          {['500 evals / month', 'Full SDK access', 'Live dashboard', 'No credit card'].map(f => (
            <span key={f} className="flex items-center gap-1">
              <CheckCircle size={11} className="text-emerald-400" /> {f}
            </span>
          ))}
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                       required placeholder="Abuelgasim Mohamed" className="pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                       required placeholder="you@example.com" className="pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                       required minLength={8} placeholder="At least 8 characters" className="pl-9" />
              </div>
            </div>

            {/* Required legal consent */}
            <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                     className="mt-0.5 w-auto" style={{ width: 'auto' }} />
              <span>
                I agree to the{' '}
                <Link href="/legal/terms" target="_blank" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/legal/privacy" target="_blank" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/08 border border-red-400/20 rounded-lg p-3">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading || !agreed} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
