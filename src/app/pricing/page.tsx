'use client'
// app/pricing/page.tsx
import Link from 'next/link'
import { Shield, CheckCircle, ArrowRight } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For developers and researchers exploring HB-Eval.',
    cta: 'Start free',
    href: '/register',
    highlight: false,
    features: [
      'Up to 2 agents',
      '500 evaluations / month (shared across your agents)',
      'All 5 reliability metrics (PEI, FRR, IRS, TI, CSI)',
      'Fault-injection battery (6 fault types × 6 domains)',
      'Local evaluation path (unverified results)',
      'Full diagnostic guidance (why you failed + how to fix)',
      'EDM memory — 3 retrievals',
      'Full SDK access (hb-eval-sdk)',
      'Live dashboard',
      '30-day evaluation history',
      'Community support (GitHub)',
    ],
    missing: [
      'Verified evaluation path (platform-run, tamper-proof)',
      'Reliability-tier credential (Meets Tier 1/2/3)',
      'HCI-EDM performance-grounded explanations',
      'Unlimited memory retrieval',
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'per month',
    description: 'For teams running agents in production who need verified, tier-qualified reliability.',
    cta: 'Join waitlist',
    href: '#waitlist',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Up to 10 agents',
      '5,000 evaluations / month (shared across your agents)',
      'All 5 reliability metrics (PEI, FRR, IRS, TI, CSI)',
      'Fault-injection battery (6 fault types × 6 domains)',
      'Verified evaluation path — platform-run, tamper-proof',
      'Reliability-tier credential — Meets Tier 1 / 2 / 3',
      'HCI-EDM explanations (grounded in your stored episodes)',
      'Unlimited EDM memory retrieval',
      'Full diagnostic guidance',
      'Full SDK access',
      'Live dashboard',
      '12-month evaluation history',
      'Priority support (email)',
    ],
    missing: [],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For organizations that need custom limits, SLAs, and onboarding.',
    cta: 'Contact us',
    href: 'mailto:gasimadam119@gmail.com',
    highlight: false,
    features: [
      'Custom agent limit',
      'Custom monthly evaluation volume',
      'All Pro features',
      'Verified path + all reliability tiers (1 / 2 / 3)',
      'Custom integration support',
      'Dedicated onboarding',
      'Audit-log export',
      'SLA guarantee',
    ],
    missing: [],
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b"
           style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <Shield size={20} className="text-blue-500" />
          HB-Eval
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login"    className="btn-secondary text-sm px-4 py-2">Sign in</Link>
          <Link href="/register" className="btn-primary  text-sm px-4 py-2">Start free</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="section-label mb-3">Pricing</p>
          <h1 className="text-5xl font-bold text-white mb-4">
            Start free. Scale when ready.
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            500 evaluations a month — shared across up to 2 agents — is enough to
            experience the system fully. The verified path and the reliability-tier
            credential unlock when you're ready for production.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {PLANS.map(plan => (
            <div key={plan.name}
                 className={`card p-7 flex flex-col relative ${
                   plan.highlight ? 'border-blue-500/40' : ''
                 }`}
                 style={plan.highlight
                   ? { background: 'rgba(37,99,235,0.07)', boxShadow: '0 0 40px rgba(37,99,235,0.12)' }
                   : {}}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold
                                text-white bg-blue-600 px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div className="font-semibold text-slate-400 text-sm mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{plan.description}</p>
              </div>

              <a href={plan.href}
                 className={`${plan.highlight ? 'btn-primary' : 'btn-secondary'} justify-center mb-6 text-sm`}>
                {plan.cta} {plan.highlight && <ArrowRight size={14} />}
              </a>

              <div className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-slate-600 line-through">
                    <CheckCircle size={13} className="text-slate-700 shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Waitlist callout */}
        <div id="waitlist" className="card p-8 max-w-xl mx-auto text-center"
             style={{ borderColor: 'rgba(37,99,235,0.20)' }}>
          <h2 className="text-xl font-bold text-white mb-2">Pro plan is coming soon</h2>
          <p className="text-slate-400 text-sm mb-6">
            We're rolling out Pro to a small group first. Leave your email and we'll reach out
            before the public launch — early users get a founding-member discount.
          </p>
          <a href="mailto:gasimadam119@gmail.com?subject=HB-Eval Pro waitlist"
             className="btn-primary text-sm">
            Join the waitlist <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
