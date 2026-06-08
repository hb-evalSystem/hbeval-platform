// app/dashboard/billing/page.tsx — Server Component shell
// Stripe-ready billing page. Today it shows the current plan and an "upgrade"
// flow that simply collects an email (we are pre-launch). The layout and the
// plan-comparison are built so that wiring Stripe later is a drop-in: the
// UpgradePanel client component has a single place where the email-capture box
// is swapped for Stripe Checkout. Nothing here touches secrets.
import { createClient } from '@/lib/supabase/server'
import { CreditCard, Check } from 'lucide-react'
import UpgradePanel from './UpgradePanel'

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: agents } = await supabase.from('agents').select('plan_type')
  const plan = (agents || [])[0]?.plan_type || 'free'

  const tiers = [
    {
      name: 'Free', price: '$0', tagline: 'For exploring and small projects',
      features: ['500 evaluations / month', 'All five reliability metrics',
                 'Diagnostic guidance', 'Community support'],
      current: plan === 'free',
    },
    {
      name: 'Pro', price: 'Coming soon', tagline: 'For teams shipping to production',
      features: ['Higher monthly limits', 'Formal Tier certification', 'Agent Passport',
                 'Performance-grounded explanations', 'Priority support'],
      current: plan === 'pro', highlight: true,
    },
  ]

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard size={22} className="text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Billing</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        You are on the <span className="text-white font-medium capitalize">{plan}</span> plan.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {tiers.map(t => (
          <div key={t.name} className="card p-6"
               style={t.highlight ? { borderColor: 'rgba(37,99,235,0.3)' } : {}}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white">{t.name}</h3>
              {t.current && <span className="badge-safe">Current</span>}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{t.price}</div>
            <p className="text-xs text-slate-500 mb-4">{t.tagline}</p>
            <ul className="space-y-2">
              {t.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                  <Check size={14} className="text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {plan === 'free' && <UpgradePanel email={user?.email || ''} />}
    </div>
  )
}
