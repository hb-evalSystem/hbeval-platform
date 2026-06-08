'use client'
// components/ui/UsageMeter.tsx
// ─────────────────────────────────────────────────────────────────────────────
// OpenAI-style usage meter. Shows how much of the monthly evaluation quota has
// been used, as a percentage with a progress bar. Also surfaces the DAILY cap:
// a user cannot burn the whole monthly allowance in one day — it is spread
// across ~4 weeks, so the daily ceiling is monthlyLimit / 28 (rounded up).
//
// This is a presentational component only — it receives numbers and renders.
// The authoritative enforcement of both limits lives server-side in the Gateway;
// this just visualises what the server reports.
import { useMemo } from 'react'

interface UsageMeterProps {
  used: number              // evaluations used this month
  limit: number             // monthly limit (e.g. 500)
  usedToday?: number        // evaluations used today (optional)
  plan?: string             // 'free' | 'pro' | 'enterprise'
  compact?: boolean         // smaller variant for the sidebar
}

export default function UsageMeter({
  used, limit, usedToday = 0, plan = 'free', compact = false,
}: UsageMeterProps) {
  const { pct, dailyCap, dailyPct, remaining } = useMemo(() => {
    const safeLimit = limit > 0 ? limit : 1
    const pct = Math.min(100, Math.round((used / safeLimit) * 100))
    // Daily cap: spread the monthly allowance across 28 days (4 weeks).
    const dailyCap = Math.max(1, Math.ceil(safeLimit / 28))
    const dailyPct = Math.min(100, Math.round((usedToday / dailyCap) * 100))
    const remaining = Math.max(0, limit - used)
    return { pct, dailyCap, dailyPct, remaining }
  }, [used, limit, usedToday])

  // Colour shifts from brand → amber → red as usage approaches the limit.
  const barColor = pct >= 90 ? 'var(--unsafe)' : pct >= 70 ? '#f59e0b' : 'var(--brand)'

  if (compact) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">Usage</span>
          <span className="text-slate-400 font-medium">{used} / {limit}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-slate-400">Monthly usage</div>
          <div className="text-xs text-slate-600 mt-0.5 capitalize">{plan} plan</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{pct}%</div>
          <div className="text-xs text-slate-500">{remaining} left</div>
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mb-4">
        <span>{used} used</span>
        <span>{limit} / month</span>
      </div>

      {/* Daily ceiling */}
      <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">Today</span>
          <span className="text-slate-400">{usedToday} / {dailyCap} daily cap</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${dailyPct}%`, background: dailyPct >= 100 ? 'var(--unsafe)' : 'var(--safe)' }} />
        </div>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Your monthly allowance is spread across the month, so no single day can
          exhaust it. The daily cap is {dailyCap} evaluations.
        </p>
      </div>
    </div>
  )
}
