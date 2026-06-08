// app/dashboard/settings/page.tsx — Server Component (Batch 2: adds data export)
// Account settings: profile, data management (export), and account deletion.
import { createClient } from '@/lib/supabase/server'
import { Settings as SettingsIcon, User, Mail, Calendar } from 'lucide-react'
import DangerZone from './DangerZone'
import ExportData from './ExportData'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const name  = user?.user_metadata?.full_name || '—'
  const email = user?.email || '—'
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon size={22} className="text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Profile</h2>
        <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { icon: User,     label: 'Full name',    value: name },
            { icon: Mail,     label: 'Email',        value: email },
            { icon: Calendar, label: 'Member since', value: joined },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-4" style={{ borderColor: 'var(--border)' }}>
              <Icon size={16} className="text-slate-500 shrink-0" />
              <span className="text-sm text-slate-500 w-32 shrink-0">{label}</span>
              <span className="text-sm text-white truncate">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Data management */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Your data</h2>
        <ExportData />
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold text-red-400/80 uppercase tracking-wide mb-3">Danger zone</h2>
        <DangerZone userEmail={email} />
      </section>
    </div>
  )
}
