// app/dashboard/layout.tsx  — Server Component
// Wraps every /dashboard page. Verifies the session server-side, fetches the
// user's aggregate usage for the sidebar meter, then renders the responsive
// sidebar + main content.
//
// RESPONSIVE FIX: the main content uses `lg:ml-64` (margin only on large
// screens) instead of a fixed `ml-64`. On mobile there is no left margin and
// the sidebar is an overlay drawer, so content fills the width with no
// horizontal scrolling. Top padding on mobile (`pt-16`) leaves room for the
// fixed hamburger button.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // The monthly evaluation pool belongs to the ACCOUNT and is shared across all
  // of the user's agents (migration 08). Read it from account_usage — the single
  // source of truth — rather than summing per-agent counters.
  const { data: quota } = await supabase
    .from('account_usage')
    .select('plan_type, evaluation_limit, evaluations_this_month, evaluations_today')
    .eq('user_id', user.id)
    .maybeSingle()

  const ACCOUNT_LIMITS: Record<string, number> = { free: 500, pro: 5000, enterprise: 2147483647 }
  const plan      = quota?.plan_type || 'free'
  const used      = quota?.evaluations_this_month ?? 0
  const usedToday = quota?.evaluations_today ?? 0
  const limit     = quota?.evaluation_limit || ACCOUNT_LIMITS[plan] || 500

  return (
    <div className="min-h-screen">
      <Sidebar user={user} usage={{ used, limit, usedToday, plan }} />
      <main className="lg:ml-64 px-4 sm:px-6 lg:px-8 pt-16 lg:pt-8 pb-10 min-h-screen">
        {children}
      </main>
    </div>
  )
}
