'use client'
// components/layout/Sidebar.tsx
// The persistent left navigation for the dashboard. It shows the user's
// identity at the top, navigation items in the middle, and upgrade prompt
// at the bottom if they are on the free plan.
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Shield, LayoutDashboard, Bot, KeyRound,
  CreditCard, Settings, LogOut, ExternalLink
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Overview'   },
  { href: '/dashboard/agents',  icon: Bot,             label: 'My Agents'  },
  { href: '/dashboard/api-keys',icon: KeyRound,        label: 'API Keys'   },
  { href: '/dashboard/billing', icon: CreditCard,      label: 'Billing'    },
  { href: '/dashboard/settings',icon: Settings,        label: 'Settings'   },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const email       = user.email || ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col py-6 px-4"
           style={{ background: 'rgba(6,12,24,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(16px)' }}>
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

      {/* External links */}
      <div className="space-y-1 mb-4">
        {[
          { label: 'Documentation',   href: 'https://github.com/hb-evalSystem/HB-System/blob/main/docs/QUICKSTART.md' },
          { label: 'Live Dashboard',  href: 'https://hb-system-fffjnvukwgqxcuyu7t7ylh.streamlit.app/' },
          { label: 'Verify Results',  href: 'https://hbeval-verify-hxkrf5egzvp5qmvhs5wqcq.streamlit.app/' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noopener"
             className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600
                        hover:text-slate-400 transition-colors">
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
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm
                           text-slate-500 hover:text-red-400 hover:bg-red-400/08 transition-all">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  )
}
