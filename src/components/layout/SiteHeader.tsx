'use client'
// src/components/layout/SiteHeader.tsx
//
// The bar across the top of every public page.
//
// WHY IT EXISTS
// The homepage opened with no way back to anything. Somebody who scrolled into
// the middle of it had no route to the documentation, the pricing, or a sign-up
// without returning to the top and hunting — which is the behaviour of a
// project page rather than a product.
//
// WHY IT HIDES INSIDE THE DASHBOARD
// The dashboard already has a sidebar carrying the same navigation. Two bars
// competing for the same job would push the working area down and duplicate
// every link, so this one steps aside where the sidebar is present.
//
// It renders on the server-rendered public pages too, so a visitor with
// JavaScript disabled still gets the navigation — the sign-in state is the only
// part that needs the client.
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const LINKS = [
  ['Demo', '/demo'],
  ['Docs', '/docs'],
  ['Architecture', '/architecture'],
  ['Science', '/science'],
  ['Pricing', '/pricing'],
] as const

// Paths that carry their own navigation. Prefix match, so every page beneath
// them is covered without listing each one — a new dashboard route should not
// have to remember to add itself here.
const OWN_NAV = ['/dashboard', '/login', '/register', '/oauth']

export default function SiteHeader() {
  const pathname = usePathname() || '/'

  if (OWN_NAV.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <header className="sticky top-0 z-40"
            style={{
              background: 'rgba(15,23,41,0.85)',
              borderBottom: '1px solid var(--border)',
              backdropFilter: 'blur(12px)',
            }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">

        {/* Name and what the thing is, together. "HB-Eval" alone tells a first
            visitor nothing, and the tagline is the shortest honest answer. */}
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="text-sm font-semibold text-white">HB-Eval</span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Operational reliability
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 ml-2">
          {LINKS.map(([label, href]) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                    className="text-xs transition-colors"
                    style={{ color: active ? '#e2e8f0' : '#94a3b8' }}>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <Link href="/login"
                className="text-xs text-slate-400 hover:text-slate-200">
            Sign in
          </Link>
          <Link href="/register"
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: 'var(--brand)', color: '#fff' }}>
            Start free
          </Link>
        </div>
      </div>

      {/* Narrow screens lose the nav row above, so it reappears here rather
          than behind a menu button. Five links do not need a drawer, and a
          drawer is one more tap between somebody and the documentation. */}
      <nav className="md:hidden flex items-center gap-4 px-6 pb-2 overflow-x-auto">
        {LINKS.map(([label, href]) => (
          <Link key={href} href={href}
                className="text-[11px] text-slate-400 whitespace-nowrap">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
