'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Only same-origin relative paths are accepted as a post-login destination.
//
// Without this, /login?redirect=https://evil.example sends the user off-site
// immediately after a successful sign-in — a phishing link that legitimately
// lives on hbeval.com right up to the moment it hands the visitor to an
// attacker's replica.
//
// Rejected: absolute URLs, protocol-relative //host (which browsers treat as
// external), and anything containing a scheme.
function safeRedirect(path: string | null): string {
  const fallback = '/dashboard'
  if (!path) return fallback
  if (!path.startsWith('/')) return fallback
  if (path.startsWith('//')) return fallback
  if (path.includes('://')) return fallback
  // Backslashes are normalised to forward slashes by some browsers, so \\evil
  // would otherwise slip past the // check above.
  if (path.includes('\\')) return fallback
  return path
}

function LoginForm() {
  const router   = useRouter()
  const params   = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const supabase = createClient()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push(redirect); router.refresh() }
  }

  return (
    <div className="card p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
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
                   required placeholder="••••••••" className="pl-9" />
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/08 border border-red-400/20 rounded-lg p-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        No account?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300">Create one free</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37,99,235,0.12), transparent)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-semibold text-xl">
            <Shield size={24} className="text-blue-500" />
            HB-Eval
          </Link>
          <p className="text-slate-400 text-sm mt-2">Sign in to your dashboard</p>
        </div>
        <Suspense fallback={<div className="card p-8 text-slate-500 text-center text-sm">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
