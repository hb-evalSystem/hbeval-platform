// src/app/status/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Public service status.
//
// WHY THIS EXISTS, AND WHY IT IS HONEST ABOUT WHAT IT IS
// Selling reliability from infrastructure with no stated reliability is a
// contradiction, and the first enterprise evaluator to look will find it.
//
// So this page states what the deployment actually is: one region, one
// instance, no redundancy, best-effort. That is less impressive than "99.9%
// uptime" and it is true, which for a project whose entire argument is about
// not overclaiming is the only version worth publishing.
//
// The numbers come from /health, which as of this release actually probes the
// database and cache rather than returning "ok" unconditionally. A status page
// fed by a health check that cannot detect ill health is decoration.
import Link from 'next/link'
import { ArrowLeft, CircleCheck, CircleAlert, CircleX, ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Status',
  description: 'Current operational status of the HB-Eval platform.',
}

// Always fetched fresh. A cached status page is a status page that lies during
// exactly the minutes it matters.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

interface Component { status: string; detail: string | null }
interface Health {
  status: string
  version: string
  timestamp: string
  components: Record<string, Component>
  retention: { last_run: string | null; last_result: unknown }
  probe_ms: number
}

const LOOK: Record<string, { colour: string; label: string; Icon: typeof CircleCheck }> = {
  ok:             { colour: '#34d399', label: 'Operational',  Icon: CircleCheck },
  degraded:       { colour: '#fbbf24', label: 'Degraded',     Icon: CircleAlert },
  down:           { colour: '#f87171', label: 'Down',         Icon: CircleX },
  not_configured: { colour: '#94a3b8', label: 'Not configured', Icon: CircleAlert },
  unreachable:    { colour: '#f87171', label: 'Unreachable',  Icon: CircleX },
}

const COMPONENT_NAMES: Record<string, string> = {
  api: 'Evaluation API',
  database: 'Database',
  cache: 'Replay protection and rate limiting',
}

async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${GATEWAY}/health`, {
      cache: 'no-store',
      // Bounded, because a page that hangs waiting on a health check has
      // reproduced the outage it was meant to report.
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function StatusPage() {
  const health = await getHealth()
  const overall = health?.status ?? 'unreachable'
  const look = LOOK[overall] ?? LOOK.unreachable

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-8">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        {/* Headline */}
        <div className="flex items-center gap-3 mb-2">
          <look.Icon size={26} style={{ color: look.colour }} />
          <h1 className="text-2xl font-bold text-white">{look.label}</h1>
        </div>
        <p className="text-sm text-slate-400 mb-8">
          {health
            ? <>Checked {new Date(health.timestamp).toUTCString()} · probe took {health.probe_ms} ms</>
            : <>The Gateway did not respond. Either it is down, or this page cannot reach it — both are shown the same way, because from here they are indistinguishable.</>}
        </p>

        {/* Components */}
        {health && (
          <div className="card overflow-hidden mb-8">
            {Object.entries(health.components).map(([key, c], i) => {
              const l = LOOK[c.status] ?? LOOK.unreachable
              return (
                <div key={key}
                     className="flex items-start justify-between gap-4 px-5 py-3.5"
                     style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">{COMPONENT_NAMES[key] ?? key}</p>
                    {c.detail && (
                      <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>
                    )}
                  </div>
                  <span className="text-xs shrink-0 flex items-center gap-1.5"
                        style={{ color: l.colour }}>
                    <l.Icon size={13} /> {l.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* What this deployment actually is. Stated plainly rather than
            implied by an uptime figure nobody is measuring. */}
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">
            What we commit to
          </h2>
          <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
            <p>
              HB-Eval runs as a <span className="text-slate-200">single instance
              in one region</span>, with no redundancy and no automatic
              failover. Service is <span className="text-slate-200">best-effort</span>:
              there is no uptime guarantee, no support commitment, and no
              compensation for downtime.
            </p>
            <p>
              That is a smaller promise than most platforms make. It is also the
              true one, and a project arguing that reliability claims should be
              measured rather than asserted is a poor place to start making
              unmeasured ones.
            </p>
            <p className="text-slate-500">
              Practically, this means: evaluation and monitoring can be
              interrupted by a deploy or an upstream incident, usually for
              minutes. Metrics already computed are not lost — the SDK computes
              them locally and the platform stores results — but a run in
              progress may fail to submit.
            </p>
          </div>
        </div>

        {/* Retention, with the evidence rather than the assurance. */}
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Data retention</h2>
          <table className="w-full text-xs mb-3">
            <tbody className="text-slate-400">
              {[
                ['Evaluation results', 'Kept until you delete them or your account'],
                ['Monitoring sessions', 'Kept until you delete them or your account'],
                ['Step-by-step snapshots', '90 days, then removed automatically'],
                ['Alert delivery records', '90 days, then removed automatically'],
                ['OAuth tokens', 'Removed on expiry'],
                ['Observatory contributions', 'Anonymised at write time — no identifier is ever stored'],
              ].map(([what, how]) => (
                <tr key={what} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="py-2 pr-4 text-slate-300 align-top">{what}</td>
                  <td className="py-2">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* The point of showing this: a retention policy nobody can verify
              is a claim. Before this release the cleanup functions existed and
              were never called, which would have made the table above false. */}
          {health?.retention?.last_run ? (
            <p className="text-[11px] text-slate-500">
              Last automatic cleanup:{' '}
              <span className="text-slate-300">
                {new Date(health.retention.last_run).toUTCString()}
              </span>
              . Published so the policy above can be checked rather than taken
              on trust.
            </p>
          ) : (
            <p className="text-[11px] text-amber-400/80">
              No cleanup has run since the service last started. The sweep runs
              a couple of minutes after startup and then daily; if this stays
              empty, the policy above is not being enforced and should not be
              believed.
            </p>
          )}
        </div>

        {/* Your rights over your own data. */}
        <div className="card p-5 mb-8">
          <h2 className="text-sm font-semibold text-white mb-3">Your data</h2>
          <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <p>
              <span className="text-slate-200">Export</span> — everything held
              about your account, as JSON, from Settings. No request, no wait.
            </p>
            <p>
              <span className="text-slate-200">Deletion</span> — removes the
              account and everything linked to it. If you chose to donate
              anonymised results to the Observatory, those are copied without
              any identifier <em>before</em> deletion proceeds, and the deletion
              is cancelled if that copy fails. Data promised to be kept is never
              lost by an operation meant to remove something else.
            </p>
            <p>
              <span className="text-slate-200">Observatory</span> — off by
              default. Contributions carry no user or agent identifier, and
              aggregate figures are withheld until at least five independent
              accounts have contributed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <a href={`${GATEWAY}/health`} target="_blank" rel="noopener noreferrer"
             className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            Raw health endpoint <ExternalLink size={11} />
          </a>
          <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">
            Export or delete your data
          </Link>
          <Link href="/observatory" className="text-blue-400 hover:text-blue-300">
            Observatory
          </Link>
        </div>

        {health && (
          <p className="text-[11px] text-slate-600 mt-8">
            Gateway protocol {health.version}
          </p>
        )}
      </div>
    </div>
  )
}
