// app/api/workspace/audit/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Export a workspace's audit trail.
//
// WHY THIS IS A SERVER ROUTE AND NOT A CLIENT QUERY
// The export joins four tables and has to prove membership before returning any
// of them. That check belongs somewhere the caller cannot edit — the database
// function does it, and this route exists to stream the result as a file rather
// than to re-implement the check.
//
// WHAT IT ANSWERS
// "Show me every automated decision this workspace made, and who was told."
// That question has been unanswerable since the audit tables were created: halt
// decisions have been recorded since migration 13 and alert deliveries since
// 17, with no way to get either out.
//
// A record nobody can retrieve is not a record.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_WINDOW_DAYS = 365
const DEFAULT_WINDOW_DAYS = 90

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required.' }, { status: 400 },
    )
  }

  // Bounded, because an unbounded window on a growing audit table is a way to
  // make the database do arbitrary work on request.
  const requested = Number(
    req.nextUrl.searchParams.get('days') ?? DEFAULT_WINDOW_DAYS,
  )
  const days = Number.isFinite(requested)
    ? Math.min(Math.max(1, Math.floor(requested)), MAX_WINDOW_DAYS)
    : DEFAULT_WINDOW_DAYS
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  // The function checks membership itself and raises if the caller is not a
  // member. Deliberately called with the USER's client, not service_role:
  // service_role bypasses RLS and auth.uid() inside the function would be
  // null, so the membership check could not identify the caller at all.
  const { data, error } = await supabase.rpc('export_workspace_audit', {
    ws: workspaceId,
    since,
  })

  if (error) {
    // Membership failures and genuine errors are both reported as 403 without
    // detail. Distinguishing them would confirm whether a given workspace id
    // exists, which is exactly what someone probing for one wants to learn.
    return NextResponse.json(
      { error: 'Could not export this workspace.' }, { status: 403 },
    )
  }

  const filename = `hbeval-audit-${workspaceId.slice(0, 8)}-${days}d.json`
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Never cached. An audit export is a point-in-time answer, and a stale
      // one presented as current is worse than no answer at all.
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
