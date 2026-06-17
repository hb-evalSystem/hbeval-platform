'use client'
// components/layout/Sidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Responsive dashboard navigation.
//   • Desktop (lg+): a fixed 256px sidebar, always visible.
//   • Mobile (< lg): hidden by default; a hamburger button (top-left) slides it
//     in as an overlay drawer, with a dim backdrop. Tapping a link or the
//     backdrop closes it. This removes the horizontal-scroll problem on phones.
//
// It also embeds the compact UsageMeter and a free-plan "Upgrade" prompt that,
// for now, collects an email (Stripe comes later — see /dashboard/billing).
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Shield, LayoutDashboard, Bot, KeyRound,
  CreditCard, Settings, LogOut, ExternalLink, Menu, X, Beaker,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import UsageMeter from '@/components/ui/UsageMeter'

const NAV_ITEMS = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'Overview'  },
  { href: '/dashboard/agents',   icon: Bot,             label: 'My Agents' },
  { href: '/dashboard/evaluate', icon: Beaker,          label: 'Evaluate'  },
  { href: '/dashboard/api-keys', icon: KeyRound,        label: 'API Keys'  },
  { href: '/dashboard/billing',  icon: CreditCard,      label: 'Billing'   },
  { href: '/dashboard/settings', icon: Settings,        label: 'Settings'  },
]

interface SidebarProps {
  user: User
  usage?: { used: number; limit: number; usedToday?: number; plan?: string }
}

export default function Sidebar({ user, usage }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)   // mobile drawer state

  // Close the drawer whenever the route changes (after tapping a link).
  useEffect(() => { setOpen(false) }, [pathname])

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const email       = user.email || ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navContent = (
    <>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-2 mb-8 text-white font-semibold">
        <Shield size={20} className="text-blue-500" />
        <span>HB-Eval <span className="text-blue-500">OS</span></span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/04'
                  }`}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Usage meter (compact) */}
      {usage && (
        <div className="my-3">
          <UsageMeter compact used={usage.used} limit={usage.limit}
                      usedToday={usage.usedToday} plan={usage.plan} />
        </div>
      )}

      {/* External links */}
      <div className="space-y-1 mb-4">
        {[
          { label: 'Documentation',  href: 'https://github.com/hb-evalSystem/HB-System/blob/main/docs/QUICKSTART.md' },
          { label: 'Live Dashboard', href: 'https://hb-system-fffjnvukwgqxcuyu7t7ylh.streamlit.app/' },
          { label: 'Verify Results', href: 'https://hbeval-verify-hxkrf5egzvp5qmvhs5wqcq.streamlit.app/' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noopener"
             className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-400 transition-colors">
            <ExternalLink size={14} />
            {label}
          </a>
        ))}
      </div>

      {/* User section */}
      <div className="border-t pt-4 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="px-3">
          <div className="text-sm font-medium text-white truncate">{displayName}</div>
          <div className="text-xs text-slate-500 truncate">{email}</div>
        </div>
        <button onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/08 transition-all">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button — visible only below lg */}
      <button onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(6,12,24,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Menu size={18} className="text-slate-300" />
      </button>

      {/* Desktop sidebar — fixed, always visible at lg+ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col py-6 px-4 z-30"
             style={{ background: 'rgba(6,12,24,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(16px)' }}>
        {navContent}
      </aside>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setOpen(false)} aria-hidden="true" />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col py-6 px-4 animate-slide-in"
                 style={{ background: 'rgba(6,12,24,0.98)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/05">
              <X size={18} />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
