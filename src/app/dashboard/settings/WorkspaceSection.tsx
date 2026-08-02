'use client'
// src/app/dashboard/settings/WorkspaceSection.tsx
//
// Workspace membership and audit export.
//
// WHAT THIS DELIBERATELY DOES NOT DO
// There is no invite flow, no role editor, no seat billing. Those need a real
// team to design well, and inventing them for nobody produces a shape the
// first actual team then has to work around.
//
// What is here is what is real today: every account has a personal workspace,
// the schema can hold shared ones, and the audit trail can finally be
// retrieved. The export is the part that needed no team to justify — an
// auditor's question is "show me every automated decision and who was told",
// and that data has been accumulating with no way to get it out.
import { useCallback, useEffect, useState } from 'react'
import {
  Users, Download, Loader2, AlertTriangle, Shield, Eye, UserCog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Workspace {
  id: string
  name: string
  is_personal: boolean
  plan_type: string
  created_at: string
}

interface Member {
  user_id: string
  role: 'owner' | 'member' | 'viewer'
  created_at: string
}

const ROLE_LOOK: Record<Member['role'], { colour: string; Icon: typeof Shield; what: string }> = {
  owner:  { colour: '#fbbf24', Icon: Shield,  what: 'Full control, including billing and deletion' },
  member: { colour: '#60a5fa', Icon: UserCog, what: 'Can use agents and see results' },
  viewer: { colour: '#94a3b8', Icon: Eye,     what: 'Read only' },
}

const WINDOWS = [30, 90, 365]

export default function WorkspaceSection({ userId }: { userId: string }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(0)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()

      // RLS scopes this to workspaces the caller belongs to. No manual filter:
      // adding one would imply the policy is optional and would mask a policy
      // regression rather than letting it fail loudly.
      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .select('id, name, is_personal, plan_type, created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (wsErr) throw wsErr

      if (!ws) {
        // Every account gets a personal workspace from a trigger, so this
        // means migration 18 has not been applied. Said plainly rather than
        // rendered as an empty panel that looks like a bug in the page.
        setError('No workspace found. Migration 18 may not have been applied yet.')
        setLoading(false)
        return
      }
      setWorkspace(ws as Workspace)

      const { data: ms } = await supabase
        .from('workspace_members')
        .select('user_id, role, created_at')
        .eq('workspace_id', (ws as Workspace).id)
        .order('created_at', { ascending: true })
      setMembers((ms ?? []) as Member[])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function exportAudit(days: number) {
    if (!workspace) return
    setExporting(days)
    try {
      const res = await fetch(
        `/api/workspace/audit?workspace_id=${workspace.id}&days=${days}`,
      )
      if (!res.ok) throw new Error(`Export failed (${res.status})`)

      // Downloaded rather than displayed: an audit export is evidence, and
      // evidence is something you keep a copy of.
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hbeval-audit-${days}d.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export.')
    } finally {
      setExporting(0)
    }
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
        <Users size={15} className="text-blue-400" /> Workspace
      </h3>

      {loading && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-3">
          <Loader2 size={11} className="animate-spin" /> Loading…
        </p>
      )}

      {error && (
        <p className="text-[11px] text-amber-300 flex items-start gap-1.5 mt-3">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {workspace && (
        <>
          <p className="text-xs text-slate-400 mb-4">
            <span className="text-slate-200">{workspace.name}</span>
            {workspace.is_personal && (
              <span className="text-slate-600"> · personal</span>
            )}
            <span className="text-slate-600"> · {workspace.plan_type}</span>
          </p>

          {/* Members */}
          <div className="space-y-1.5 mb-5">
            {members.map(m => {
              const look = ROLE_LOOK[m.role]
              const isYou = m.user_id === userId
              return (
                <div key={m.user_id}
                     className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                     style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-200 font-mono">
                      {isYou ? 'You' : `${m.user_id.slice(0, 8)}…`}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {look.what}
                    </span>
                  </div>
                  <span className="text-[11px] flex items-center gap-1 shrink-0"
                        style={{ color: look.colour }}>
                    <look.Icon size={11} /> {m.role}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Honest about what is not built yet, rather than showing a
              disabled "Invite" button that implies it nearly is. */}
          {workspace.is_personal && (
            <p className="text-[11px] text-slate-600 mb-5 leading-relaxed">
              Shared workspaces are supported by the schema but have no
              invitation flow yet. Roles and onboarding are being designed with
              the first teams to use them rather than guessed at in advance.
            </p>
          )}

          {/* Audit export */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-4">
            <p className="text-xs text-slate-300 mb-1">Audit export</p>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Every halt decision with the policy that caused it, every alert
              and whether it was delivered, and every monitored session. JSON,
              downloaded directly.
            </p>
            <div className="flex gap-2">
              {WINDOWS.map(days => (
                <button key={days} onClick={() => exportAudit(days)}
                        disabled={exporting !== 0}
                        className="btn-secondary text-[11px] px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-60">
                  {exporting === days
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Download size={11} />}
                  {days === 365 ? '1 year' : `${days} days`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-2">
              Step-by-step snapshots and delivery records are kept for 90 days;
              a longer window returns the sessions and halt decisions that
              outlive them.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
