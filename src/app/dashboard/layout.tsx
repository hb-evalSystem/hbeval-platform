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

  // Aggregate usage across the user's agents for the sidebar meter.
  // RLS guarantees only this user's agents are returned.
  const { data: agents } = await supabase
    .from('agents')
    .select('plan_type, evaluation_limit, evaluations_this_month')

  const used  = (agents || []).reduce((s, a) => s + (a.evaluations_this_month || 0), 0)
  const limit = (agents || []).reduce((s, a) => s + (a.evaluation_limit || 0), 0) || 500
  const plan  = (agents || [])[0]?.plan_type || 'free'

  return (
    <div className="min-h-screen">
      <Sidebar user={user} usage={{ used, limit, plan }} />
      <main className="lg:ml-64 px-4 sm:px-6 lg:px-8 pt-16 lg:pt-8 pb-10 min-h-screen">
        {children}
      </main>
    </div>
  )
}
