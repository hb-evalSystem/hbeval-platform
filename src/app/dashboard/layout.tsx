// app/dashboard/layout.tsx  — Server Component
// This layout wraps every page under /dashboard. It verifies the session
// server-side (so there's never a flash of unauthenticated content), then
// renders the persistent sidebar and top bar around the page content.
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

  // This should be caught by middleware first, but acts as a second
  // guarantee that unauthenticated requests never reach dashboard pages.
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
