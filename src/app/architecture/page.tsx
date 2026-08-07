// src/app/architecture/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// How the system fits together.
//
// WHY THIS PAGE EXISTS
// A visitor can read every feature page and still not know where their data
// goes, what leaves their machine, or what we can see. Those are the first
// questions an engineer with production responsibility asks, and until now the
// answers were scattered across the SDK source and the documentation.
//
// DRAWN FROM THE CODE, NOT FROM AN IDEAL
// Every arrow below was checked against the implementation: the SDK really
// does compute metrics locally, streaming really is encrypted and signed with
// the same envelope as evaluation, the batch really is sent off the agent's
// thread. Where the picture would flatter us, it says the awkward thing
// instead.
import Link from 'next/link'
import {
  ArrowLeft, ArrowDown, Cpu, Package, Lock, Server, Database,
  BadgeCheck, Globe, ShieldCheck, Eye, EyeOff,
} from 'lucide-react'

export const metadata = {
  title: 'Architecture — HB-Eval',
  description: 'Where your data goes, what leaves your machine, and what HB-Eval can see.',
}

function Layer({ icon: Icon, title, subtitle, children, accent }: {
  icon: typeof Cpu; title: string; subtitle: string
  children: React.ReactNode; accent: string
}) {
  return (
    <div className="card p-5" style={{ borderColor: `${accent}44` }}>
      <div className="flex items-center gap-2.5 mb-2">
        <Icon size={17} style={{ color: accent }} />
        <p className="text-sm text-white">{title}</p>
        <span className="text-[11px] text-slate-500">{subtitle}</span>
      </div>
      <div className="text-xs text-slate-300 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      <ArrowDown size={15} className="text-slate-600" />
      <span className="text-[10px] text-slate-500 mt-0.5">{label}</span>
    </div>
  )
}

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        <h1 className="text-3xl font-bold text-white mb-3">Architecture</h1>
        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-10">
          Where your data goes, what leaves your machine, and what we can see.
          Every arrow below reflects the implementation rather than an intended
          design.
        </p>

        {/* ── The path ── */}
        <Layer icon={Cpu} title="Your agent" subtitle="your infrastructure" accent="#94a3b8">
          <p>
            Runs wherever it already runs. HB-Eval does not host it, proxy its
            model calls, or sit between it and its tools. Its control flow is
            unchanged.
          </p>
        </Layer>

        <Arrow label="one adapter call, or one import" />

        <Layer icon={Package} title="HB-Eval SDK" subtitle="in your process" accent="#60a5fa">
          <p>
            <strong className="text-slate-100">This is where measurement
            happens.</strong> The five metrics are computed locally, in your
            process, from running tallies — about 0.002 ms per step, flat from a
            hundred steps to fifty thousand.
          </p>
          <p>
            Safe Halt is decided here too. That matters: if the network is down,
            your policy still fires. A guard that needs a round trip is a guard
            that fails exactly when infrastructure is already struggling.
          </p>
          <p className="text-slate-400">
            Python and TypeScript. Or nothing at all —{' '}
            <Link href="/docs#otel" className="text-blue-400 hover:text-blue-300">
              one import
            </Link>{' '}
            derives signals from OpenTelemetry spans you already emit.
          </p>
        </Layer>

        <Arrow label="AES-256-GCM, HMAC-signed, off the agent's thread" />

        <Layer icon={Lock} title="The wire" subtitle="what actually leaves" accent="#fbbf24">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: 'rgba(52,211,153,0.08)' }}>
              <p className="text-[11px] text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <Eye size={11} /> Sent
              </p>
              <ul className="text-[11px] text-slate-300 space-y-1">
                <li>Metric values and step counts</li>
                <li>Threshold breaches and halt decisions</li>
                <li>Action names you pass to record_step</li>
                <li>Measured monitoring overhead</li>
              </ul>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(248,113,113,0.08)' }}>
              <p className="text-[11px] text-red-300 flex items-center gap-1.5 mb-1.5">
                <EyeOff size={11} /> Not sent
              </p>
              <ul className="text-[11px] text-slate-300 space-y-1">
                <li>Prompts and model responses</li>
                <li>Tool arguments and returned data</li>
                <li>Anything your agent processed</li>
                <li>Your model provider credentials</li>
              </ul>
            </div>
          </div>
          <p className="text-slate-400">
            Telemetry uses the same encrypted, signed envelope as evaluation —
            live monitoring is not a lower-security path. Batches leave on a
            separate thread, so network latency never enters your agent&rsquo;s
            execution time, and a failed send is dropped rather than raised:
            instrumentation is not permitted to be the reason a run breaks.
          </p>
          <p className="text-slate-400">
            <strong className="text-slate-100">The exception worth knowing:</strong>{' '}
            on the evaluation path you submit a task deliberately, so its text
            does reach the Gateway to be scored. It is encrypted in transit and
            not retained after scoring.
          </p>
        </Layer>

        <Arrow label="HTTPS" />

        <Layer icon={Server} title="Gateway" subtitle="Railway · FastAPI" accent="#a78bfa">
          <p>
            Authenticates, verifies the signature, rejects replayed requests,
            enforces quota, and scores evaluation runs against the fault
            battery. Dispatches alerts to Slack, PagerDuty or your webhook.
          </p>
          <p>
            Holds the passport signing key — which is why passports are signed
            here and nowhere else. A key present in two deployments is a key
            with two chances of leaking.
          </p>
        </Layer>

        <Arrow label="row-level security, per account" />

        <Layer icon={Database} title="Storage" subtitle="Supabase · PostgreSQL" accent="#34d399">
          <p>
            Sessions, metric history, halt decisions with the policy that caused
            each one, alert delivery records including the failures.
          </p>
          <p>
            Agent secrets are encrypted at rest; the API key is stored only as a
            hash. Step-level snapshots are removed after 90 days by a job that
            actually runs — the last successful sweep is published on the{' '}
            <Link href="/status" className="text-blue-400 hover:text-blue-300">
              status page
            </Link>.
          </p>
        </Layer>

        {/* ── What comes out ── */}
        <div className="my-8">
          <p className="section-label mb-4">What comes out</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/dashboard/monitoring" className="card p-4 block">
              <ShieldCheck size={16} className="text-blue-400 mb-2" />
              <p className="text-sm text-white mb-1">Dashboard</p>
              <p className="text-[11px] text-slate-400">
                Timeline, replay, comparison between runs.
              </p>
            </Link>
            <Link href="/docs#passport" className="card p-4 block">
              <BadgeCheck size={16} style={{ color: '#c9a227' }} className="mb-2" />
              <p className="text-sm text-white mb-1">Agent Passport</p>
              <p className="text-[11px] text-slate-400">
                Signed record, verifiable by anyone, no account needed.
              </p>
            </Link>
            <Link href="/observatory" className="card p-4 block">
              <Globe size={16} className="text-emerald-400 mb-2" />
              <p className="text-sm text-white mb-1">Observatory</p>
              <p className="text-[11px] text-slate-400">
                Anonymous aggregates, opt-in, withheld below five contributors.
              </p>
            </Link>
          </div>
        </div>

        {/* ── The honest part ── */}
        <div className="card p-5 mb-8" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
          <p className="text-sm text-white mb-2">What this architecture cannot do</p>
          <ul className="text-xs text-slate-300 leading-relaxed space-y-1.5 list-disc pl-5">
            <li>
              Because the SDK sits beside your agent rather than in front of it,
              it cannot block a tool call. Safe Halt stops the next step; it
              never reverses the last one.
            </li>
            <li>
              Because prompts and responses stay with you, we cannot tell whether
              an answer was correct. The metrics measure behaviour under fault,
              not truth.
            </li>
            <li>
              Because the Gateway is a single instance in one region, an outage
              means telemetry is lost for its duration. Your agent keeps running
              and your policies keep firing — but the record has a hole in it.
            </li>
          </ul>
          <p className="text-[11px] text-slate-400 mt-3">
            The first two are deliberate trades. The third is a limitation, and
            it is stated on the{' '}
            <Link href="/status" className="text-blue-400 hover:text-blue-300">
              status page
            </Link>{' '}
            rather than discovered during an incident.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/demo" className="btn-primary text-xs px-4 py-2">
            Watch it run
          </Link>
          <Link href="/docs" className="btn-secondary text-xs px-4 py-2">
            Documentation
          </Link>
          <Link href="/docs#production" className="btn-secondary text-xs px-4 py-2">
            Production guide
          </Link>
        </div>
      </div>
    </div>
  )
}
