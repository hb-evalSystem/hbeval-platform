// src/app/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The landing page.
//
// WHAT WENT WRONG BEFORE, AND WHY THIS IS A REBUILD
// Eleven capabilities were built and the homepage mentioned five of them not at
// all. Somebody arriving here could not learn that Agent Passport existed, or
// the Fault Injection Studio, or either SDK. A platform that works completely
// and reads like it did three months ago is a platform whose best work is
// invisible.
//
// So every capability appears below, each with a link that goes somewhere real.
// The test applied to each card: could a stranger act on this in one click?
//
// THE ARGUMENT THE PAGE HAS TO MAKE
// One idea, in order: benchmarks measure whether an agent finished. Nobody
// measures how it behaved while failing. That gap is where production
// incidents live, and it is measurable.
//
// Everything else — metrics, monitoring, halting, passports — is machinery in
// service of that sentence, and is introduced only after it lands.
import Link from 'next/link'
import {
  ArrowRight, Play, Activity, Beaker, Bell, Shield, GitBranch,
  BadgeCheck, Radio, Boxes, Globe, FileCode, Terminal, LineChart,
  AlertTriangle, CheckCircle2,
} from 'lucide-react'

export const metadata = {
  title: 'HB-Eval — Operational reliability for agentic AI',
  description:
    'Measure how an AI agent behaves when things go wrong, not just whether '
    + 'it finished. Five metrics, live monitoring, Safe Halt, and a signed '
    + 'record anyone can verify.',
}

const PY_VERSION = '2.7.0'
const JS_VERSION = '0.1.1'

const METRICS = [
  ['PEI', 'Planning Efficiency',
   'Is the plan holding, or is the agent redoing it?',
   'Repeated re-planning means the agent is thrashing, not thinking.'],
  ['FRR', 'Failure Resilience',
   'Of the steps where a fault was present, how many still completed?',
   'Undefined until a fault actually happens — resilience cannot be scored against nothing.'],
  ['IRS', 'Intentional Recovery',
   'Was the recovery reasoned, or a blind retry?',
   'The difference between an agent that adapts and one that repeats itself faster.'],
  ['TI', 'Traceability',
   'Can each decision be followed afterwards?',
   'An agent nobody can audit is an agent nobody should deploy.'],
  ['CSI', 'Consistency Stability',
   'Does the same task produce the same behaviour across runs?',
   'Needs repeated runs, so it stays undefined inside a single session.'],
] as const

const CAPABILITIES = [
  { icon: Radio, title: 'Zero-setup instrumentation',
    body: 'One import derives reliability signals from OpenTelemetry spans you already emit. No new instrumentation code.',
    href: '/docs#otel', cta: 'How derivation works' },
  { icon: Activity, title: 'Live monitoring',
    body: 'Metrics computed per step, streamed while the agent runs. Timeline, replay, and comparison between runs.',
    href: '/dashboard/monitoring', cta: 'Open monitoring' },
  { icon: Shield, title: 'Safe Halt',
    body: 'Stop a run when resilience collapses. Cooperative, sustained rather than instant, and off unless you configure it.',
    href: '/docs#safe-halt', cta: 'How halting works' },
  { icon: GitBranch, title: 'Policy engine',
    body: 'Retry, escalate or halt on a metric breach — with three independent limits so a policy cannot loop forever.',
    href: '/docs#policy', cta: 'Policy reference' },
  { icon: Beaker, title: 'Fault Injection Studio',
    body: 'Six fault types across six domains. Preview the exact text your agent would receive before running anything.',
    href: '/dashboard/studio', cta: 'Open the studio' },
  { icon: Terminal, title: 'CI reliability gate',
    body: 'Gate a pull request on reliability, comparing against your own baseline rather than an absolute floor.',
    href: '/docs#gate', cta: 'Set up the gate' },
  { icon: Bell, title: 'Alerting',
    body: 'Slack, PagerDuty or a plain webhook. Twenty breaches raise one alert, not twenty.',
    href: '/dashboard/settings', cta: 'Configure alerts' },
  { icon: LineChart, title: 'Observatory',
    body: 'Aggregate reliability across contributed runs. Anonymous at write time, withheld until five independent accounts.',
    href: '/observatory', cta: 'View the data' },
  { icon: Globe, title: 'Status and retention',
    body: 'Health checked rather than asserted, with the last automatic data cleanup published so the policy is verifiable.',
    href: '/status', cta: 'Service status' },
] as const

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="px-6 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="section-label mb-4">Operational reliability for agentic AI</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Your agent finished the task.
            <br />
            <span className="text-blue-400">Did it behave?</span>
          </h1>
          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
            Benchmarks measure whether an agent completed its work. Almost
            nothing measures how it behaved while things were going wrong —
            and that is where production incidents come from. HB-Eval measures
            it, watches it live, and can stop a run before the damage lands.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/demo"
                  className="btn-primary px-6 py-3 inline-flex items-center gap-2">
              <Play size={16} /> Watch an agent fail
            </Link>
            <Link href="/register"
                  className="btn-secondary px-6 py-3 inline-flex items-center gap-2">
              Start free <ArrowRight size={16} />
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            The demo needs no account. 500 evaluations a month on the free plan.
          </p>
        </div>
      </section>

      {/* ── The gap ── */}
      <section className="px-6 py-14" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">The reliability gap</h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-8">
            An agent can retry the same failing call three times, lose its
            reasoning trail, recover by accident, and still deliver the right
            answer. Pass/fail scores it a success. The next time the same
            weakness appears, it will not be so lucky.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                What benchmarks measure
              </p>
              <p className="text-lg text-white mb-1">Task completed</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nominal performance, under conditions where nothing broke.
              </p>
            </div>
            <div className="card p-5" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-400" />
                What nobody measures
              </p>
              <p className="text-lg text-white mb-1">
                Behaviour under fault
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Whether recovery was reasoned, whether the plan held, whether
                anyone can reconstruct what happened.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="px-6 py-14" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Five metrics</h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-8">
            Each answers a question a completion score cannot.
          </p>

          <div className="space-y-3">
            {METRICS.map(([key, name, question, why]) => (
              <div key={key} className="card p-5 flex flex-wrap gap-4">
                <div className="w-16 shrink-0">
                  <p className="text-lg font-mono text-blue-400">{key}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white mb-1">{name}</p>
                  <p className="text-sm text-slate-300 mb-1.5">{question}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{why}</p>
                </div>
              </div>
            ))}
          </div>

          {/* The principle that governs every layer of the system, stated where
              a reader meets the metrics rather than buried in the docs. */}
          <div className="card p-5 mt-4" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
            <p className="text-sm text-white mb-1.5">
              Undefined is never reported as zero
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              A metric that was never measured shows as a dash, all the way to
              the wire. Reporting it as 0.00 would claim a measured failure on a
              dimension nothing examined — and a chart, a gate or an auditor
              reading that zero would draw a confident, wrong conclusion.
            </p>
          </div>
        </div>
      </section>

      {/* ── Connect your agent ── */}
      <section className="px-6 py-14" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">
            Measure your own agent
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-6">
            Wrap your existing loop. Nothing about the agent changes, and the
            instrumentation costs about 0.002 ms per step.
          </p>

          <div className="card overflow-hidden mb-4">
            <div className="px-4 py-2 text-xs text-slate-400"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              Python
            </div>
            <pre className="p-4 text-[12px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`pip install hb-eval-sdk==${PY_VERSION}

from hb_eval_sdk import HBEvalClient

client = HBEvalClient(api_key=..., aes_key=..., signing_secret=...)

with client.monitor(
    agent_id="support-agent",
    halt_policy={"metric": "frr", "below": 0.5, "for_steps": 3},
) as session:
    for step in my_agent.run(task):
        session.record_step(
            action=step.name,
            success=step.ok,
            had_fault=step.faulted,
        )
        if session.should_halt:
            break            # cooperative: your loop decides how to stop`}
            </pre>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <a href="https://pypi.org/project/hb-eval-sdk/" target="_blank"
               rel="noopener noreferrer" className="card p-4 block">
              <p className="text-sm text-white flex items-center gap-1.5 mb-1">
                <Boxes size={14} className="text-blue-400" /> Python SDK
              </p>
              <p className="text-xs text-slate-400">
                hb-eval-sdk {PY_VERSION} — full platform: battery, policies,
                CI gate, OpenTelemetry.
              </p>
            </a>
            <a href="https://www.npmjs.com/package/hb-eval-sdk-js" target="_blank"
               rel="noopener noreferrer" className="card p-4 block">
              <p className="text-sm text-white flex items-center gap-1.5 mb-1">
                <FileCode size={14} className="text-amber-400" /> TypeScript SDK
              </p>
              <p className="text-xs text-slate-400">
                hb-eval-sdk-js {JS_VERSION} — protocol and live monitoring for
                Node agents.
              </p>
            </a>
            <Link href="/dashboard/evaluate" className="card p-4 block">
              <p className="text-sm text-white flex items-center gap-1.5 mb-1">
                <Beaker size={14} className="text-purple-400" /> Run an evaluation
              </p>
              <p className="text-xs text-slate-400">
                Score an agent against the fault battery from the dashboard.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="px-6 py-14" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">What is included</h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-8">
            Every item links somewhere you can use it now.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAPABILITIES.map(({ icon: Icon, title, body, href, cta }) => (
              <Link key={href} href={href} className="card p-5 block group">
                <Icon size={17} className="text-blue-400 mb-2.5" />
                <p className="text-sm text-white mb-1.5">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{body}</p>
                <span className="text-xs text-blue-400 inline-flex items-center gap-1 group-hover:text-blue-300">
                  {cta} <ArrowRight size={11} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent Passport ── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-8"
               style={{ background: '#0d1b2f', border: '1px solid rgba(201,162,39,0.25)' }}>
            <p className="text-[11px] tracking-[0.3em] mb-4" style={{ color: '#c9a227' }}>
              HB-EVAL AGENT PASSPORT
            </p>
            <h2 className="text-2xl font-bold text-white mb-3">
              A record of behaviour anyone can verify
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-5 max-w-2xl">
              Every halt decision with the policy that caused it, every alert and
              whether it was delivered, the five metrics over 30, 60 and 90 days
              — signed with Ed25519 and published at a link.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mb-5 max-w-2xl">
              The signature is checked in the reader&rsquo;s own browser against a
              public key we publish. An auditor, a customer or a regulator
              verifies it <span className="text-white">without asking us and
              without our permission</span> — which is the only thing that makes
              such a record worth more than a claim.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-5">
              {['No overall grade — the weakest dimension is named',
                'Expires after 90 days, because behaviour changes',
                'Not a certification'].map(t => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded"
                      style={{ background: 'rgba(201,162,39,0.10)', color: '#d4b855' }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/docs#passport"
                    className="inline-flex items-center gap-1.5" style={{ color: '#c9a227' }}>
                <BadgeCheck size={15} /> How it works
              </Link>
              <Link href="/dashboard/agents" className="text-blue-400 hover:text-blue-300">
                Issue one for your agent
              </Link>
              <a href="/api/passport-key" target="_blank" rel="noopener noreferrer"
                 className="text-slate-400 hover:text-slate-200">
                Public key
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Research ── */}
      <section className="px-6 py-14" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Built on published work</h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-6">
            The framework, the metric definitions and the fault methodology are
            described in a manuscript under review, with three companion
            preprints on adaptive planning, evaluation-driven memory, and
            performance-grounded explanation.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/docs#research" className="text-blue-400 hover:text-blue-300">
              Papers and methodology
            </Link>
            <a href="https://github.com/hb-evalSystem/HB-System" target="_blank"
               rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              Reproduction repository
            </a>
          </div>
        </div>
      </section>

      {/* ── Close ── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            See it before you sign up
          </h2>
          <p className="text-sm text-slate-300 mb-6">
            Two minutes, no account, no keys. The same agent with and without a
            reliability policy.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/demo" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
              <Play size={16} /> Open the demo
            </Link>
            <Link href="/docs" className="btn-secondary px-6 py-3">
              Read the documentation
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            {([
              ['Product', [
                ['Demo', '/demo'], ['Documentation', '/docs'],
                ['Pricing', '/pricing'], ['Observatory', '/observatory'],
                ['Status', '/status'],
              ]],
              ['Use it', [
                ['Dashboard', '/dashboard'], ['Evaluate', '/dashboard/evaluate'],
                ['Monitoring', '/dashboard/monitoring'],
                ['Fault Studio', '/dashboard/studio'],
                ['Agents', '/dashboard/agents'],
              ]],
              ['Developers', [
                ['Python SDK', 'https://pypi.org/project/hb-eval-sdk/'],
                ['TypeScript SDK', 'https://www.npmjs.com/package/hb-eval-sdk-js'],
                ['Repository', 'https://github.com/hb-evalSystem/HB-System'],
                ['Passport key', '/api/passport-key'],
                ['Verify a passport', '/verify'],
              ]],
              ['Legal', [
                ['Privacy', '/legal/privacy'], ['Terms', '/legal/terms'],
              ]],
            ] as const).map(([heading, links]) => (
              <div key={heading}>
                <p className="text-xs text-slate-200 mb-3">{heading}</p>
                <ul className="space-y-2">
                  {links.map(([label, href]) => (
                    <li key={href}>
                      {href.startsWith('http') || href.startsWith('/api') ? (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-slate-400 hover:text-slate-200">
                          {label}
                        </a>
                      ) : (
                        <Link href={href}
                              className="text-xs text-slate-400 hover:text-slate-200">
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            HB-Eval · Protocol {PY_VERSION} · Independent research project
          </p>
        </div>
      </footer>
    </div>
  )
}
