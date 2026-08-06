// src/app/docs/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The complete reference: what HB-Eval is, what every piece does, how they
// differ, and how to go from nothing to a first evaluation and a first
// monitored run.
//
// SERVER COMPONENT BY DESIGN
// All content here is static — nobody's data appears on this page. Rendering
// it on the server means faster first paint and a fully-formed page for
// search engines to index, with no client-side data fetch to wait on. Only
// CopyButton is a client component, kept small and isolated.
//
// ANCHOR IDS ARE A CONTRACT
// The homepage links here as /docs#evaluation, /docs#monitoring,
// /docs#safe-halt and /docs#mcp. Every section below carries the matching id
// exactly. Renaming a heading without renaming its id silently breaks those
// links — verified against the actual homepage source before delivery.
import type { Metadata } from 'next'
import Link from 'next/link'
import PassportVerifier from './PassportVerifier'
import {
  BookOpen, ArrowLeft, Play, Activity, OctagonX, Telescope, Bot, Terminal,
  ArrowRight, ChevronRight, KeyRound, Beaker, ShieldCheck, MessageSquare,
  Layers, GitBranch, Radio, Bell, BadgeCheck, Boxes,
  GitPullRequest, BookMarked, AlertTriangle, Rocket,
} from 'lucide-react'
import CopyButton from './CopyButton'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'How HB-Eval measures agent reliability: the five metrics, local and verified evaluation, live monitoring, Safe Halt, the Observatory, and connecting via MCP.',
  alternates: { canonical: 'https://hbeval.com/docs' },
}

const DOCS_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'HB-Eval Documentation',
  description:
    'Reference documentation for HB-Eval: reliability metrics, evaluation paths, runtime monitoring, Safe Halt, the Observatory, and MCP.',
  url: 'https://hbeval.com/docs',
}

// ── Small building blocks ───────────────────────────────────────────────────
function Code({ children, lang = 'python' }: { children: string; lang?: string }) {
  return (
    <div className="rounded-xl overflow-hidden my-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between px-4 py-2"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <Terminal size={11} /> {lang}
        </span>
        <CopyButton text={children} />
      </div>
      <pre className="p-4 text-[12.5px] leading-relaxed overflow-x-auto font-mono text-slate-300"
           style={{ background: 'rgba(0,0,0,0.25)' }}>{children}</pre>
    </div>
  )
}

function Section({ id, title, icon, kicker, children }: {
  id: string; title: string; icon: React.ReactNode; kicker: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 py-14 border-t"
             style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <p className="section-label mb-2 flex items-center gap-2">{icon}{kicker}</p>
      <h2 className="text-3xl font-bold text-white mb-6">{title}</h2>
      {children}
    </section>
  )
}

const NAV = [
  { href: '#what-it-is', label: 'What HB-Eval is' },
  { href: '#metrics', label: 'The five metrics' },
  { href: '#quickstart', label: 'Quickstart' },
  { href: '#evaluation', label: 'Evaluation' },
  { href: '#monitoring', label: 'Monitoring' },
  { href: '#safe-halt', label: 'Safe Halt' },
  { href: '#policy', label: 'Policy engine' },
  { href: '#otel', label: 'OpenTelemetry' },
  { href: '#studio', label: 'Fault Studio' },
  { href: '#gate', label: 'CI gate' },
  { href: '#alerts', label: 'Alerting' },
  { href: '#production', label: 'Production guide' },
  { href: '#passport', label: 'Agent Passport' },
  { href: '#sdks', label: 'Python and TypeScript' },
  { href: '#production', label: 'Production guide' },
  { href: '#observatory', label: 'Observatory' },
  { href: '#mcp', label: 'MCP' },
  { href: '#journey', label: 'Full walkthrough' },
  { href: '#compare', label: 'Which one do I use?' },
  { href: '#research', label: 'Research' },
  { href: '#limits', label: 'What this does not do' },
]

// Same wording as _METRICS_REFERENCE in the Gateway's mcp_tools.py, on purpose:
// this page and the MCP tool answer the same question, and giving different
// descriptions in two places is how documentation quietly starts lying.
const METRICS = [
  { key: 'PEI', name: 'Planning Efficiency Index', range: '0–1',
    measures: 'Whether the plan is coherent and economical rather than wasteful. Repeated re-planning drives it down.' },
  { key: 'FRR', name: 'Failure Resilience Rate', range: '0–1',
    measures: 'Whether the agent keeps functioning when a fault is injected, rather than collapsing.' },
  { key: 'IRS', name: 'Intentional Recovery Score', range: '0–1, or undefined',
    measures: 'Whether recovery from failure was deliberate rather than accidental. Defined only on faulted episodes — recovery is meaningless with nothing to recover from.' },
  { key: 'TI', name: 'Traceability Index', range: '0–5',
    measures: "Whether the agent's behaviour can be followed and audited step by step." },
  { key: 'CSI', name: 'Consistency Stability Index', range: '0–1, or undefined',
    measures: 'Whether the agent behaves the same way across repeated runs, or drifts. Needs several runs, so it is undefined within a single session.' },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DOCS_STRUCTURED_DATA) }}
      />

      {/* Header */}
      <div className="px-6 pt-10 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
            <ArrowLeft size={14} /> hbeval.com
          </Link>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-3">
            <BookOpen size={30} className="text-blue-400" /> Documentation
          </h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            What HB-Eval measures, how each part works, how they differ, and how
            to go from nothing to a first evaluation and a first monitored run.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[200px_1fr] gap-10">

        {/* Sticky nav — plain CSS position:sticky, no scroll-spy JavaScript.
            Fewer moving parts means fewer ways for this page to break. */}
        <nav className="hidden lg:block">
          <div className="sticky top-8 space-y-1">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}
                 className="block text-[13px] text-slate-400 hover:text-white py-1 transition-colors">
                {n.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0">

          {/* ── What it is ──────────────────────────────────────────────── */}
          <section id="what-it-is" className="scroll-mt-24 pb-14">
            <p className="section-label mb-2 flex items-center gap-2"><Layers size={13} /> Start Here</p>
            <h2 className="text-3xl font-bold text-white mb-6">What HB-Eval measures</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Capability benchmarks answer one question: what can this agent do
              under clean conditions? They say almost nothing about what happens
              when a tool call fails, the context degrades, or an input turns
              adversarial — and that gap between benchmark performance and
              behaviour under failure is what HB-Eval measures directly, by
              injecting faults on purpose and scoring what survives.
            </p>
            <p className="text-slate-400 leading-relaxed mb-4">
              The platform gives you five ways to use that measurement, and each
              answers a different question:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-2">
              {[
                { icon: <Beaker size={14} />, t: 'Evaluate', d: 'Was this agent reliable, once?', c: '#3b82f6' },
                { icon: <Activity size={14} />, t: 'Monitor', d: 'Is it still reliable, right now?', c: '#34d399' },
                { icon: <OctagonX size={14} />, t: 'Safe Halt', d: 'Should it keep running?', c: '#f87171' },
                { icon: <Telescope size={14} />, t: 'Observatory', d: 'How does the field compare?', c: '#a78bfa' },
                { icon: <Bot size={14} />, t: 'MCP', d: 'Can I ask my assistant instead?', c: '#fbbf24' },
              ].map((x) => (
                <div key={x.t} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                     style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ color: x.c }}>{x.icon}</span>
                  <div>
                    <span className="text-sm text-white font-medium">{x.t}</span>
                    <span className="text-xs text-slate-500 ml-2">{x.d}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Metrics ──────────────────────────────────────────────────── */}
          <Section id="metrics" title="The five metrics" kicker="Reference" icon={<GitBranch size={13} />}>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th className="text-left font-medium py-2 pr-4">Metric</th>
                    <th className="text-left font-medium py-2 pr-4">Measures</th>
                    <th className="text-left font-medium py-2">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m) => (
                    <tr key={m.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-3 pr-4 align-top">
                        <span className="text-white font-semibold">{m.key}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.name}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 align-top">{m.measures}</td>
                      <td className="py-3 text-slate-500 align-top whitespace-nowrap">{m.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-200 mb-1">Undefined is not zero</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                IRS with no injected fault, or CSI within a single run, were not
                measured — they are reported as undefined, everywhere in the
                platform, and never coerced to zero. A zero would claim a
                measured failure on a dimension nothing examined.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Tiers are governed by the <span className="text-slate-300">weakest</span>{' '}
              required metric, not the average — an agent cannot average its way
              to trustworthiness by excelling on some dimensions while failing a
              critical one.
            </p>
          </Section>

          {/* ── Quickstart ───────────────────────────────────────────────── */}
          <Section id="quickstart" title="Quickstart" kicker="Five Minutes" icon={<Play size={13} />}>
            <ol className="space-y-5">
              <li>
                <p className="text-sm text-slate-300 mb-2">
                  <span className="text-white font-medium">1. Install the SDK</span>
                </p>
                <Code lang="bash">pip install hb-eval-sdk==2.7.0</Code>
              </li>
              <li>
                <p className="text-sm text-slate-300 mb-2">
                  <span className="text-white font-medium">2. Create an agent</span>{' '}
                  and copy its keys from{' '}
                  <Link href="/dashboard/agents" className="text-blue-400 hover:text-blue-300">
                    Dashboard → Agents
                  </Link>.
                </p>
              </li>
              <li>
                <p className="text-sm text-slate-300 mb-2">
                  <span className="text-white font-medium">3. Run your first evaluation</span>
                </p>
                <Code>{`from hb_eval_sdk import HBEvalClient

client = HBEvalClient(api_key=..., aes_key=..., signing_secret=...)

def my_agent(system_prompt: str, question: str) -> str:
    return call_your_model(system_prompt, question)

base_task = {
    "system": "You are a customer support agent.",
    "question": "A shipment is three days late. Respond appropriately.",
}
report = client.evaluate_with_battery(base_task, my_agent, n_scenarios=18)
print(report["verdict"], report["aggregate_metrics"])`}</Code>
              </li>
            </ol>
          </Section>

          {/* ── Evaluation ───────────────────────────────────────────────── */}
          <Section id="evaluation" title="Evaluation — after the run" kicker="Post-Hoc Scoring" icon={<Beaker size={13} />}>
            <p className="text-slate-300 leading-relaxed mb-6">
              Evaluation runs a fault-injection battery against an agent and
              returns a verdict once it finishes. There are two paths, and they
              answer different trust questions.
            </p>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th className="text-left font-medium py-2 pr-4"></th>
                    <th className="text-left font-medium py-2 pr-4">Local (Path B)</th>
                    <th className="text-left font-medium py-2">Verified (Path A)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  {[
                    ['Who runs the agent', 'Your machine', 'The platform, calling your endpoint'],
                    ['Your model keys', 'Never leave your machine', "Not applicable — the platform calls your agent's own API"],
                    ['Tamper resistance', 'Self-reported responses', 'Nobody in the middle — the result is verified'],
                    ['Cost', 'Free', 'Requires a paid plan'],
                    ['Needs', 'A callable agent_runner', 'A public HTTPS endpoint + explicit consent'],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-2.5 pr-4 text-slate-300">{row[0]}</td>
                      <td className="py-2.5 pr-4">{row[1]}</td>
                      <td className="py-2.5">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-white mb-2">Local — evaluate_with_battery</p>
            <Code>{`report = client.evaluate_with_battery(
    base_task, my_agent, n_scenarios=18,
)`}</Code>

            <p className="text-sm text-white mb-2 mt-6">Verified — request_verified_evaluation</p>
            <Code>{`report = client.request_verified_evaluation(
    agent_url="https://my-agent.example.com/run",
    base_task=base_task,
    consent=True,      # the platform will call this endpoint
    n_scenarios=30,
)`}</Code>

            <p className="text-xs text-slate-500 mt-6">
              Already have a LangChain, LangGraph or CrewAI agent? Adapters wrap
              it into the shape both paths expect — see the{' '}
              <Link href="/dashboard/evaluate" className="text-blue-400 hover:text-blue-300">
                Evaluate page
              </Link> for framework-specific snippets.
            </p>
          </Section>

          {/* ── Monitoring ───────────────────────────────────────────────── */}
          <Section id="monitoring" title="Monitoring — during the run" kicker="Real-Time" icon={<Activity size={13} />}>
            <p className="text-slate-300 leading-relaxed mb-4">
              Evaluation judges a run once it is over. Monitoring watches an
              agent <span className="text-slate-100">while it executes</span>,
              recomputing the metrics after every step, so a collapse is visible
              at the step it happens rather than in a post-mortem.
            </p>
            <p className="text-slate-400 leading-relaxed mb-6">
              Per-step signals are computed locally, in your process — real-time
              monitoring cannot afford a network call per step, and that is also
              why basic monitoring is free. Only the session summary, sent in
              small periodic batches, reaches the platform.
            </p>

            <Code>{`with client.monitor(agent_id="my-agent") as m:
    for step in agent.run(task):
        m.record_step(
            action=step.name,
            success=step.ok,
            had_fault=step.fault_injected,
            recovered_intentionally=step.deliberate_recovery,
            traceable=step.has_reasoning,
        )
        if m.should_halt:
            break

print(m.summary)`}</Code>

            <p className="text-xs text-slate-500 mt-4">
              Sessions and live metrics appear on the{' '}
              <Link href="/dashboard/monitoring" className="text-blue-400 hover:text-blue-300">
                Monitoring dashboard
              </Link> as they happen.
            </p>
          </Section>

          {/* ── Safe Halt ────────────────────────────────────────────────── */}
          <Section id="safe-halt" title="Safe Halt — stop the collapse" kicker="Measurement That Acts" icon={<OctagonX size={13} />}>
            <p className="text-slate-300 leading-relaxed mb-6">
              Detecting a collapse is only half of what a safety mechanism owes
              you — the other half is stopping before the damage compounds.
              <code className="code-inline mx-1">halt_policy</code>
              turns a sustained breach into a halt decision.
            </p>

            <Code>{`with client.monitor(
    agent_id="my-agent",
    halt_policy={"metric": "frr", "below": 0.5, "for_steps": 3},
) as m:
    for step in agent.run(task):
        m.record_step(...)
        if m.should_halt:
            print(m.halt_reason)
            break`}</Code>

            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              {[
                { t: 'Sustained, not instant', d: 'One bad step is noise. A guard that fires on noise gets switched off, so the metric must stay under the floor for several consecutive steps.' },
                { t: 'Cooperative, not forced', d: "Nothing is killed mid-step — that is how transactions end up half-applied. The session raises should_halt; your loop decides how to stop." },
                { t: 'Off unless you ask', d: 'No halt_policy means observation only. Stopping an agent without being asked is not a default anyone should inherit.' },
              ].map((x) => (
                <div key={x.t} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-sm text-white mb-1">{x.t}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{x.d}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Observatory ──────────────────────────────────────────────── */}
          <Section id="policy" title="Policy engine — act on a breach"
                   kicker="Automated Response" icon={<GitBranch size={13} />}>
            <p>
              Safe Halt stops a run. A policy can try something less drastic
              first: retry the step, or escalate to a human, and halt only when
              neither helped.
            </p>
            <Code>{`with client.monitor(
    agent_id="my-agent",
    policies=[
        {"when": {"metric": "frr", "below": 0.6, "for_steps": 2},
         "then": "retry"},
        {"when": {"metric": "irs", "below": 0.4, "for_steps": 3},
         "then": "escalate"},
        {"when": {"metric": "frr", "below": 0.3, "for_steps": 5},
         "then": "halt"},
    ],
) as session:
    for step in my_agent.run(task):
        session.record_step(action=step.name, success=step.ok,
                            had_fault=step.faulted)

        directive = session.take_directive()
        if directive and directive.action == "retry":
            my_agent.retry_last()
        elif directive and directive.action == "escalate":
            notify_a_human(directive.reason)

        if session.should_halt:
            break`}</Code>

            <p>
              <strong className="text-slate-100">Off unless configured.</strong>{' '}
              No <code className="code-inline">policies</code> argument means
              observation only. Acquiring the ability to retry somebody&rsquo;s
              agent by upgrading a library would be a surprise nobody asked for.
            </p>

            <p>
              <strong className="text-slate-100">Three limits stop a loop.</strong>{' '}
              A policy fires at most three times per session; a directive is
              consumed when read, so it cannot be acted on twice; and two failed
              retries escalate rather than retry again. A permanently failing
              agent therefore produces two retries and one escalation, then
              silence — not five hundred retries and a bill.
            </p>

            <p>
              <strong className="text-slate-100">There is no rollback
              action.</strong> Undoing an agent&rsquo;s effects requires knowing
              what they were and how to reverse them, which is specific to your
              system and unknowable to a monitoring library. A policy claiming
              to roll back would be claiming something it cannot deliver, and
              the failure would surface at the worst possible moment.
            </p>
          </Section>

          <Section id="otel" title="OpenTelemetry — no new instrumentation"
                   kicker="Zero Setup" icon={<Radio size={13} />}>
            <p>
              If your agent already emits OpenTelemetry spans, reliability
              signals can be derived from them. One import, no calls to add.
            </p>
            <Code>{`import hb_eval_sdk.auto   # that is the whole setup

# Your agent runs unchanged. Spans it already emits become steps.`}</Code>

            <p>What is derived, and from what:</p>
            <ul>
              <li>A span recording an exception, or setting its status to ERROR,
                  becomes a step with a fault.</li>
              <li>A retry — the same operation name repeating with no different
                  operation between — becomes a step with no deliberate recovery.</li>
              <li>A span carrying reasoning or decision attributes counts as
                  traceable.</li>
              <li>A planning span reappearing after execution has begun counts as
                  a re-plan.</li>
            </ul>

            <p>
              <strong className="text-slate-100">What cannot be derived.</strong>{' '}
              A step that fails silently — no exception, no error status, just a
              wrong answer returned confidently — is invisible on this path.
              Spans record what happened mechanically, not whether it was
              correct. Derived metrics are therefore a floor on how bad things
              were, never a ceiling, and that is worth knowing before relying on
              them.
            </p>
            <p>
              Explicit <code className="code-inline">record_step</code> calls
              stay more accurate, because you know things about your agent that
              its spans do not say. Derivation exists to get measurement in place
              today rather than after a week of instrumentation work.
            </p>
          </Section>

          <Section id="studio" title="Fault Injection Studio — see the injection"
                   kicker="Choose Before You Run" icon={<Beaker size={13} />}>
            <p>
              The battery injects six kinds of fault across six domains.
              &ldquo;Context corruption&rdquo; is a label until you see what it
              does to a prompt, so the{' '}
              <Link href="/dashboard/studio" className="text-blue-400 hover:text-blue-300">
                studio
              </Link>{' '}
              shows the exact text your agent would receive — without running
              anything, spending quota, or needing an account.
            </p>

            <ul>
              <li><strong className="text-slate-100">tool_failure</strong> — a
                  dependency goes offline; the agent must work from what it has.</li>
              <li><strong className="text-slate-100">context_corruption</strong> —
                  data arrives conflicting; the agent must notice rather than
                  trust it.</li>
              <li><strong className="text-slate-100">stochastic</strong> — noise
                  with no real signal; the agent must not overreact to nothing.</li>
              <li><strong className="text-slate-100">adversarial</strong> —
                  pressure to skip verification; the agent must hold its standards.</li>
              <li><strong className="text-slate-100">cascade</strong> — primary
                  fails and the backup degrades; failures compound.</li>
              <li><strong className="text-slate-100">combined</strong> — several
                  at once, which is what production actually looks like.</li>
            </ul>

            <Code>{`report = client.evaluate_with_battery(
    task, my_agent,
    n_scenarios=18,
    seed=42,                                    # same seed, same battery
    fault_types=["tool_failure", "cascade"],    # optional narrowing
)`}</Code>

            <p>
              <strong className="text-slate-100">Narrowing has a cost, and it is
              reported.</strong> A run covering two fault types is not comparable
              with one covering six, however similar the numbers look. Both the
              studio and the report say so, rather than letting a green result
              from a narrow battery read like a green result from a full one.
            </p>
          </Section>

          <Section id="gate" title="CI gate — block a bad pull request"
                   kicker="Continuous Integration" icon={<GitPullRequest size={13} />}>
            <p>
              Run the battery on every pull request and compare against your own
              previous result.
            </p>
            <Code lang="yaml">{`# .github/workflows/reliability.yml
name: Reliability
on: [pull_request]

jobs:
  reliability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hb-evalSystem/hb-eval-sdk@v2.7.0
        env:
          HBEVAL_API_KEY: SECRET
          HBEVAL_AES_KEY: SECRET
          HBEVAL_SIGNING_SECRET: SECRET
        with:
          agent: 'myapp.agent:run'
          task: '.hbeval/task.json'
          scenarios: '18'
          seed: '42'
          baseline: '.hbeval/baseline.json'
          enforce: false      # start here`}</Code>
            <p className="text-xs text-slate-400">
              Replace each SECRET with a GitHub secret reference. Credentials go
              in <code className="code-inline">env</code> rather than{' '}
              <code className="code-inline">with</code>, because action inputs
              appear in build logs.
            </p>

            <p>
              <strong className="text-slate-100">Start in warn mode.</strong>{' '}
              With <code className="code-inline">enforce: false</code> the gate
              reports and never blocks. Run it that way for a couple of weeks
              first: agents built on language models vary between runs, and a
              gate that blocks on ordinary variance gets switched off within days
              — after which it protects nothing.
            </p>
            <p>
              <strong className="text-slate-100">Compare against a baseline, not
              an absolute floor.</strong> &ldquo;FRR must exceed 0.8&rdquo; fails
              the day a model update shifts every number slightly. &ldquo;FRR
              must not fall more than 0.05 below our own last result&rdquo;
              catches regressions and tolerates drift.
            </p>
            <p>
              A failing run never updates the baseline. Otherwise each small
              regression becomes the new normal, and the gate ratchets quietly
              downward while continuing to report success.
            </p>
            <p>
              Exit codes: <code className="code-inline">0</code> pass,{' '}
              <code className="code-inline">1</code> gate failed,{' '}
              <code className="code-inline">2</code> configuration error — which
              always blocks, whatever <code className="code-inline">enforce</code>{' '}
              says, because a gate that could not run has measured nothing.
            </p>
          </Section>

          <Section id="alerts" title="Alerting — tell someone"
                   kicker="Slack, PagerDuty, Webhook" icon={<Bell size={13} />}>
            <p>
              Configure destinations in{' '}
              <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">
                Settings
              </Link>
              . A halt or a sustained threshold breach sends a message.
            </p>
            <ul>
              <li><strong className="text-slate-100">Slack</strong> — formatted
                  attachments, readable on a phone at 3am.</li>
              <li><strong className="text-slate-100">PagerDuty</strong> — halts as
                  critical, breaches as warnings, deduplicated by session.</li>
              <li><strong className="text-slate-100">Webhook</strong> — plain JSON
                  to any endpoint.</li>
            </ul>
            <p>
              <strong className="text-slate-100">Twenty breaches raise one
              alert.</strong> A degrading agent breaches the same threshold on
              every step; twenty identical messages train everyone to ignore the
              channel, which is worse than not alerting at all. A halt always
              alerts separately and is never deduplicated against breaches — it
              is a different event and means something different.
            </p>
            <p>
              A destination failing ten times consecutively is disabled
              automatically, and re-enabling clears the counter. Delivery
              failures are recorded and appear in the Agent Passport: an alerting
              record that hid undelivered alerts would read as though everyone
              had been told.
            </p>
          </Section>

          <Section id="production" title="Putting this into production"
                   kicker="Rollout Guide" icon={<Rocket size={13} />}>
            <p>
              Measurement is easy to install and easy to install badly. This is
              the order that works, and the mistakes that make teams switch it
              off in week three.
            </p>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              Week one — observe, change nothing
            </h3>
            <p>
              Wrap your loop with no policy and no halting. You are collecting a
              baseline, not enforcing one.
            </p>
            <Code>{`with client.monitor(agent_id="support-agent") as session:
    for step in my_agent.run(task):
        session.record_step(action=step.name, success=step.ok,
                            had_fault=step.faulted)`}</Code>
            <p>
              Resist setting thresholds from the defaults on day one. The
              defaults — PEI 0.70, FRR 0.65, IRS 0.60, TI 3.00 — are a starting
              point derived from the reference implementation, not a claim about
              your agent. Yours may sit legitimately below one of them because
              of how it is built.
            </p>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              Week two — read your own distribution
            </h3>
            <p>
              Open{' '}
              <Link href="/dashboard/monitoring" className="text-blue-400 hover:text-blue-300">
                Monitoring
              </Link>{' '}
              and look at the spread, not the average. The question is not
              &ldquo;what is my FRR&rdquo; but &ldquo;how far does my FRR move
              between two runs of the same task&rdquo;.
            </p>
            <p>
              That spread is your noise floor, and it decides everything else. A
              threshold inside it fires on ordinary variation; an alert built on
              it pages somebody at 3am for nothing, and the third false page is
              when the alerting gets muted.
            </p>
            <p>
              A workable rule: set each floor roughly one typical run-to-run
              swing below your median. If your FRR sits at 0.82 and moves about
              0.06 between runs, 0.74 is defensible and 0.80 is not.
            </p>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              Week three — alert, still do not halt
            </h3>
            <p>
              Add a destination in{' '}
              <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">
                Settings
              </Link>{' '}
              and let it run for a week without acting on anything. You are
              testing the thresholds, not the agent. If the channel is quiet
              during a week you know was fine, the thresholds are usable. If it
              is noisy, they are too high — lower them and wait again.
            </p>
            <p>
              <strong className="text-slate-100">Alert on halts and on
              sustained breaches, never on single steps.</strong> A single step
              below a floor is noise by construction; that is why every
              threshold takes a <code className="code-inline">for_steps</code>{' '}
              count.
            </p>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              Week four — halt, on your least ambiguous metric
            </h3>
            <Code>{`with client.monitor(
    agent_id="support-agent",
    thresholds={"frr": 0.74, "irs": 0.55, "pei": 0.68, "ti": 3.2},
    halt_policy={"metric": "frr", "below": 0.5, "for_steps": 3},
) as session:
    for step in my_agent.run(task):
        session.record_step(action=step.name, success=step.ok,
                            had_fault=step.faulted)
        if session.should_halt:
            logger.warning(session.halt_reason)
            break`}</Code>
            <p>
              Start with FRR. It has the clearest operational meaning — the
              agent is meeting faults and not absorbing them — and the fewest
              ways to be misread. IRS is a good second once you trust your
              recovery labelling.
            </p>
            <p>
              <strong className="text-slate-100">Halt well below your alert
              floor.</strong> The alert floor says &ldquo;look at this&rdquo;;
              the halt floor says &ldquo;stop working&rdquo;. Setting them
              equal means every alert is also an outage.
            </p>
            <p>
              <strong className="text-slate-100">Handle the halt
              deliberately.</strong> <code className="code-inline">break</code>{' '}
              is the simplest correct answer, but decide what your system owes
              the user at that moment: a partial result, a queued retry, a human
              handoff. A halt with no plan attached is an unexplained failure
              from the customer&rsquo;s side.
            </p>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              Week five — gate the pipeline
            </h3>
            <p>
              Add the{' '}
              <a href="#gate" className="text-blue-400 hover:text-blue-300">CI gate</a>{' '}
              in warn mode with a baseline. Switch{' '}
              <code className="code-inline">enforce</code> on only after you have
              seen it stay quiet through a fortnight of ordinary merges.
            </p>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              Operational notes
            </h3>
            <ul>
              <li>
                <strong className="text-slate-100">Quotas are shared across
                agents.</strong> The free plan allows 500 evaluations a month
                and 3 agents; Pro allows 5,000. Monitoring sessions do not
                consume evaluation quota.
              </li>
              <li>
                <strong className="text-slate-100">Telemetry fails soft.</strong>{' '}
                If the Gateway is unreachable, monitoring drops the batch and
                your agent continues. Instrumentation is never permitted to be
                the reason a run breaks — but it does mean a network problem
                shows up as missing data, not as an error.
              </li>
              <li>
                <strong className="text-slate-100">Step snapshots are kept 90
                days.</strong> Sessions and halt decisions outlive them. If you
                need a longer record, issue an{' '}
                <a href="#passport" className="text-blue-400 hover:text-blue-300">
                  Agent Passport
                </a>{' '}
                — it is signed and does not expire from our side.
              </li>
              <li>
                <strong className="text-slate-100">Rotate keys from the agent
                page.</strong> Rotation invalidates the old key immediately, so
                deploy the new one before rotating rather than after.
              </li>
              <li>
                <strong className="text-slate-100">Watch the overhead
                figure.</strong> It is measured and reported per session. If it
                climbs, something in your integration is doing work inside{' '}
                <code className="code-inline">record_step</code> that should be
                outside it.
              </li>
            </ul>

            <h3 className="text-sm text-slate-100 mt-6 mb-2">
              The failure mode to avoid
            </h3>
            <p>
              Teams that abandon reliability measurement almost always do it the
              same way: thresholds set too high on day one, a noisy first week,
              alerts muted, and six months later a dashboard nobody opens.
            </p>
            <p>
              The opposite failure is quieter and worse. Thresholds lowered
              whenever CI goes red, until everything passes and the metrics no
              longer describe anything. Lowering a floor does not change how an
              agent behaves — the numbers come out identical, only the breach
              count falls. You can watch that happen in the{' '}
              <Link href="/demo" className="text-blue-400 hover:text-blue-300">
                playground
              </Link>{' '}
              in one click.
            </p>
            <p>
              A threshold you have never seen fire is not evidence of a reliable
              agent. It is evidence of a threshold you cannot trust.
            </p>
          </Section>



          <Section id="passport" title="Agent Passport — a record anyone can verify"
                   kicker="Signed Evidence" icon={<BadgeCheck size={13} />}>
            <p>
              A passport collects everything an agent can be asked to account for
              — the five metrics over 30, 60 and 90 days, every halt decision
              with the policy that caused it, every alert and whether it arrived,
              session counts and measured overhead — and signs it with Ed25519.
            </p>
            <p>
              Issue one from your agent&rsquo;s page in the dashboard. Publishing
              is a separate, explicit act that produces a public link, a QR code
              and a printable PDF, and can be withdrawn at any time.
            </p>

            <p>
              <strong className="text-slate-100">Anyone can verify it without
              asking us.</strong> The public key is published at{' '}
              <a href="/api/passport-key" target="_blank" rel="noopener noreferrer"
                 className="text-blue-400 hover:text-blue-300">/api/passport-key</a>.
              Three steps:
            </p>
            <ol>
              <li>Remove the <code className="code-inline">signature</code> object
                  from the passport.</li>
              <li>Render whole numbers without a decimal point (10.0 to 10).</li>
              <li>Serialise as JSON with sorted keys and no whitespace, UTF-8,
                  then verify <code className="code-inline">signature.value</code>{' '}
                  over those bytes.</li>
            </ol>

            <Code lang="javascript">{`import { webcrypto as crypto } from 'node:crypto'

const sortDeep = v => Array.isArray(v) ? v.map(sortDeep)
  : (v && typeof v === 'object'
      ? Object.keys(v).sort().reduce((a, k) => (a[k] = sortDeep(v[k]), a), {})
      : v)

const { signature, ...body } = passport
const bytes = new TextEncoder().encode(JSON.stringify(sortDeep(body)))

// Raw Ed25519 key wrapped in the SPKI header Web Crypto expects
const header = new Uint8Array([48,42,48,5,6,3,43,101,112,3,33,0])
const raw = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0))
const spki = new Uint8Array([...header, ...raw])

const key = await crypto.subtle.importKey('spki', spki,
                                          { name: 'Ed25519' }, false, ['verify'])

const valid = await crypto.subtle.verify(
  { name: 'Ed25519' }, key,
  Uint8Array.from(atob(signature.value), c => c.charCodeAt(0)),
  bytes,
)`}</Code>

            <p>
              <Link href="/verify" className="text-blue-400 hover:text-blue-300">
                Or drop a file into the verifier
              </Link>{' '}
              — it runs in your browser, uploads nothing, and where a trace
              includes steps it also recomputes the metrics from them.
            </p>

            <p>
              Step two matters more than it looks: Python writes{' '}
              <code className="code-inline">10.0</code> where JavaScript writes{' '}
              <code className="code-inline">10</code>, and a signature covers
              bytes. The signer normalises this, so verifiers in any language
              need no special handling.
            </p>

            <PassportVerifier />


            <p>
              <strong className="text-slate-100">It is not a certification.</strong>{' '}
              HB-Eval is not an accreditation body, performs no third-party
              audit, and makes no warranty about future behaviour. It records
              observed behaviour and signs the record — a smaller claim, and one
              this system can actually support.
            </p>
            <p>
              <strong className="text-slate-100">There is no overall grade.</strong>{' '}
              Five numbers are reported and the weakest is named. A single label
              is exactly where a weak dimension hides, and an agent excellent at
              four dimensions and broken at the fifth is a broken agent.
            </p>
            <p>
              <strong className="text-slate-100">It expires after 90 days</strong>,
              because behaviour changes: a model is swapped, a prompt edited, a
              dependency degrades. A record with no end date invites exactly the
              misuse it should prevent.
            </p>
          </Section>

          <Section id="sdks" title="Python and TypeScript"
                   kicker="Two Clients, One Protocol" icon={<Boxes size={13} />}>
            <Code lang="bash">{`pip install hb-eval-sdk==2.7.0      # Python — everything
npm install hb-eval-sdk-js          # Node — protocol and monitoring`}</Code>

            <p>
              Both speak the same wire protocol to the same Gateway, verified by
              round-trip: ciphertext produced by one is decrypted by the other,
              and signatures computed in both languages match byte for byte. A
              JavaScript agent and a Python agent appear in the same dashboard,
              under the same metrics, in the same passport.
            </p>

            <p>
              They do not yet cover the same ground, and pretending otherwise
              would waste your afternoon:
            </p>
            <ul>
              <li><strong className="text-slate-100">Both</strong> — live
                  monitoring, the five metrics, Safe Halt, overhead measurement.</li>
              <li><strong className="text-slate-100">Python only</strong> — the
                  fault battery, the policy engine, the CI gate, OpenTelemetry
                  derivation, and <code className="code-inline">hb-eval demo</code>.</li>
            </ul>
            <p>
              The Python semantics went through eleven rounds of correction
              before the port was written. Maintaining two immature SDKs would
              have meant fixing every mistake twice, so the TypeScript client
              ships thin and correct rather than broad and unproven.
            </p>

            <Code lang="typescript">{`import { HBEvalClient } from 'hb-eval-sdk-js'

const client = new HBEvalClient({ apiKey, aesKey, signingSecret })

await client.withMonitor(
  { agentId: 'support-agent',
    haltPolicy: { metric: 'frr', below: 0.5, forSteps: 3 } },
  async (session) => {
    for (const step of await agent.run(task)) {
      session.recordStep({ action: step.name, success: step.ok,
                           hadFault: step.faulted })
      if (session.shouldHalt) break
    }
  },
)`}</Code>
          </Section>

          <Section id="production" title="Taking this to production"
                   kicker="Rollout Guide" icon={<Rocket size={13} />}>
            <p>
              The demo shows what the metrics mean. This is what to actually do
              on Monday, in the order that avoids the two ways teams usually
              abandon reliability tooling: alert fatigue, and a gate that blocks
              on noise.
            </p>

            <p className="text-slate-100">Week one — measure, change nothing</p>
            <p>
              Wrap your agent loop and ship it. No halt policy, no CI gate, no
              alerts. You are collecting a picture of how your agent already
              behaves, and you cannot choose sensible thresholds without one.
            </p>
            <Code>{`with client.monitor(agent_id="support-agent") as session:
    for step in my_agent.run(task):
        session.record_step(action=step.name, success=step.ok,
                            had_fault=step.faulted)`}</Code>
            <p>
              Overhead is around 0.002 ms per step, so this is safe to leave on
              in production from the first day. Do not skip to week two early:
              thresholds chosen from intuition rather than from your own data
              are the single most common reason this kind of tooling gets turned
              off.
            </p>

            <p className="text-slate-100">Week two — choose thresholds from your data</p>
            <p>
              Open{' '}
              <Link href="/dashboard/monitoring" className="text-blue-400 hover:text-blue-300">
                monitoring
              </Link>{' '}
              and look at the spread, not the average. A useful floor sits below
              almost every normal run and above the runs you would want to know
              about — roughly the 5th percentile of what you observed, rounded
              down.
            </p>
            <p>
              The SDK defaults (PEI 0.7, FRR 0.65, IRS 0.6, TI 3.0) are a
              starting point drawn from the paper&rsquo;s dataset, not from your
              agent. Expect to move them.
            </p>
            <p>
              If your agent sits below a default on a metric even when nothing
              is wrong, that is worth understanding before you lower the floor —
              a consistently low IRS usually means recovery is not being
              reported, not that recovery is not happening. Check what you pass
              as <code className="code-inline">recovered_intentionally</code>{' '}
              before concluding the agent is at fault.
            </p>

            <p className="text-slate-100">Week three — alert, and only on what you would act on</p>
            <p>
              Add one destination. Start with halts only: they are rare, and an
              alert nobody has learned to ignore is worth ten that everybody
              has. Add breach alerts on a single metric once halts feel routine.
            </p>
            <p>
              If a channel produces more than a couple of messages a day, the
              threshold is wrong. Raising the alert threshold is the correct
              response; muting the channel is how teams end up with monitoring
              nobody reads.
            </p>

            <p className="text-slate-100">Week four — halt, on your least ambiguous metric</p>
            <Code>{`with client.monitor(
    agent_id="support-agent",
    halt_policy={"metric": "frr", "below": 0.4, "for_steps": 5},
) as session:
    ...
    if session.should_halt:
        break`}</Code>
            <p>
              Start further below the floor and require more sustained steps
              than feels necessary. A halt that fires once wrongly costs more
              trust than ten halts that fire correctly earn, because the team
              remembers the false one.
            </p>
            <p>
              Make sure your loop actually stops. <code className="code-inline">should_halt</code>{' '}
              is a flag; nothing enforces it. And check what your agent leaves
              behind when it stops mid-task — a half-written record is a
              different problem from a slow one.
            </p>

            <p className="text-slate-100">Week five — gate the pipeline in warn mode</p>
            <p>
              Add the{' '}
              <a href="#gate" className="text-blue-400 hover:text-blue-300">CI gate</a>{' '}
              with <code className="code-inline">enforce: false</code> and a
              baseline. Watch it for a fortnight. You are measuring your own
              run-to-run variance: if the gate would have blocked pull requests
              that were fine, your tolerance is too tight, and finding that out
              while it blocks nothing costs nothing.
            </p>
            <p>
              Turn on <code className="code-inline">enforce</code> only once a
              fortnight has passed with no false blocks.
            </p>

            <p className="text-slate-100">Operational notes</p>
            <ul>
              <li>
                <strong className="text-slate-100">Fail-soft is the
                default.</strong> If the Gateway is unreachable, monitoring
                silently degrades and your agent keeps running. Telemetry must
                never be the reason a production run breaks — which also means
                a quiet dashboard can mean a network problem rather than a
                healthy week. Check{' '}
                <Link href="/status" className="text-blue-400 hover:text-blue-300">
                  status
                </Link>{' '}
                before concluding nothing happened.
              </li>
              <li>
                <strong className="text-slate-100">Rotate keys on a
                schedule.</strong> Rotation invalidates the old key
                immediately, so deploy the new credentials before rotating, not
                after.
              </li>
              <li>
                <strong className="text-slate-100">Step snapshots are kept 90
                days</strong>, sessions and halt decisions for longer. Export an
                audit trail before a compliance deadline rather than after —
                see{' '}
                <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">
                  Settings
                </Link>.
              </li>
              <li>
                <strong className="text-slate-100">Issue a passport when
                something changes</strong> — a model swap, a prompt rewrite, a
                new dependency. A passport records a 90-day window, so one
                issued the week after a change describes the agent before it.
              </li>
              <li>
                <strong className="text-slate-100">Free plan limits.</strong>{' '}
                500 evaluations a month and 3 agents. Monitoring sessions are
                not evaluations and are not capped — measuring continuously
                should not be the expensive part.
              </li>
            </ul>

            <p className="text-slate-100">What good looks like after a month</p>
            <p>
              Thresholds you chose from your own data. One alert channel that
              fires rarely enough to be read. A halt policy on one metric. A CI
              gate in warn mode with a baseline. And a passport you could hand
              to somebody outside the team without explaining anything first.
            </p>
            <p>
              That is a working reliability practice. Everything else here is
              refinement.
            </p>
          </Section>

          <Section id="observatory" title="Observatory — the field, not the lab" kicker="Public Statistics" icon={<Telescope size={13} />}>
            <p className="text-slate-300 leading-relaxed mb-4">
              Published studies measure agents under controlled conditions. The{' '}
              <Link href="/observatory" className="text-blue-400 hover:text-blue-300">Observatory</Link>{' '}
              publishes aggregate reliability statistics from agents running in
              actual deployments, so the two can be compared.
            </p>
            <p className="text-slate-400 leading-relaxed mb-4">
              Contribution is opt-in, set from{' '}
              <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300">Settings</Link>,
              and off by default. Identifiers are dropped before a contribution
              is written — never stored, not merely hidden — and figures are
              withheld until at least five independent accounts have
              contributed.
            </p>
            <Link href="/observatory" className="btn-secondary text-sm px-5 py-2.5 inline-flex items-center gap-1.5">
              View live statistics <ArrowRight size={14} />
            </Link>
          </Section>

          {/* ── MCP ──────────────────────────────────────────────────────── */}
          <Section id="mcp" title="MCP — ask your assistant" kicker="No Dashboard Needed" icon={<Bot size={13} />}>
            <p className="text-slate-300 leading-relaxed mb-6">
              HB-Eval is a remote MCP server. Add one URL to an MCP-capable
              assistant, sign in once, and ask in plain language — the
              assistant discovers and calls the tools itself.
            </p>

            <div className="card p-4 mb-6">
              <p className="text-xs text-slate-500 mb-1">Server URL</p>
              <Code lang="url">https://hbeval-reliability-os-production.up.railway.app/mcp</Code>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { name: 'Claude', steps: ['Settings → Connectors → Add custom connector', 'Paste the server URL', 'Sign in and approve when prompted'] },
                { name: 'ChatGPT', steps: ['Settings → Security and login → Developer mode', 'Add the server URL as a connector', 'Sign in and approve'] },
                { name: 'Gemini', steps: ['Available via Gemini Enterprise', 'Register the URL as a connector (Streamable HTTP)', 'Complete the OAuth sign-in'] },
              ].map((c) => (
                <div key={c.name} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-sm text-white font-medium mb-2">{c.name}</p>
                  <ol className="space-y-1">
                    {c.steps.map((s, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <ChevronRight size={12} className="mt-0.5 shrink-0 text-slate-600" /> {s}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <p className="text-sm text-white mb-3">What you can ask</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['list_my_agents', '"What agents do I have?"'],
                    ['get_reliability_metrics', '"What does FRR measure?"'],
                    ['get_reliability_trend', '"Is my agent improving?"'],
                    ['retrieve_qualified_memory', '"How was this handled before?"'],
                    ['explain_verdict', '"Why did this verdict come out this way?"'],
                    ['evaluate_agent_reliability', '"Run a reliability check on my agent." (paid plan)'],
                  ].map(([tool, ex]) => (
                    <tr key={tool} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-2 pr-4 font-mono text-[12px] text-blue-300">{tool}</td>
                      <td className="py-2 text-slate-400">{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Only <code className="code-inline">get_reliability_metrics</code> and{' '}
              <code className="code-inline">list_my_agents</code> work with no agent
              on the account yet — the rest need one created first.
            </p>
          </Section>

          {/* ── Full walkthrough ─────────────────────────────────────────── */}
          <Section id="journey" title="From nothing to a monitored agent" kicker="Full Walkthrough" icon={<KeyRound size={13} />}>
            <ol className="space-y-4">
              {[
                ['Register', 'Create an account at hbeval.com — free, no card.'],
                ['Create an agent', 'Dashboard → Agents → New. Copy the API key, AES key and signing secret shown once.'],
                ['First evaluation', 'Run the Quickstart snippet above with your own agent_runner. You get a verdict and the five metrics.'],
                ['First monitored run', 'Wrap your agent loop in client.monitor(...). Watch it on the Monitoring dashboard while it runs.'],
                ['Optional: Safe Halt', 'Add a halt_policy once you know which metric matters most for that agent.'],
                ['Optional: Observatory', 'Turn on contribution in Settings if you want your (anonymised) results included in the public aggregate.'],
                ['Optional: connect MCP', 'Add the server URL to Claude, ChatGPT or Gemini and ask about your agents directly.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm text-white font-medium">{t}</p>
                    <p className="text-xs text-slate-400">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* ── Comparison ───────────────────────────────────────────────── */}
          <Section id="compare" title="Which one do I use?" kicker="Decision Guide" icon={<MessageSquare size={13} />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th className="text-left font-medium py-2 pr-4">If you want to…</th>
                    <th className="text-left font-medium py-2">Use</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  {[
                    ['Score an agent before shipping it', 'Evaluation (local)'],
                    ['Prove a result to someone else', 'Evaluation (verified)'],
                    ['Watch reliability while an agent works', 'Monitoring'],
                    ['Stop a collapsing agent automatically', 'Safe Halt (on top of Monitoring)'],
                    ['See how the industry compares', 'Observatory'],
                    ['Do any of this without opening a dashboard', 'MCP'],
                  ].map(([q, a]) => (
                    <tr key={q} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-2.5 pr-4 text-slate-300">{q}</td>
                      <td className="py-2.5 text-white">{a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary text-sm px-6 py-3 inline-flex items-center gap-1.5">
                Start free <ArrowRight size={14} />
              </Link>
              <Link href="/observatory" className="btn-secondary text-sm px-6 py-3 inline-flex items-center gap-1.5">
                <ShieldCheck size={14} /> View the Observatory
              </Link>
            </div>
          </Section>

          <Section id="research" title="Research"
                   kicker="Where This Comes From" icon={<BookMarked size={13} />}>
            <p>
              The framework, the metric definitions and the fault methodology
              are described in a manuscript under review, with three companion
              preprints: adaptive planning using PEI as a live control signal,
              evaluation-driven memory that admits only episodes clearing a
              quality bar, and performance-grounded explanation that cites
              stored episodes rather than generating a plausible narrative.
            </p>
            <p>
              The reproduction repository contains the Python implementation,
              the dataset, and the tests.
            </p>
            <p>
              <strong className="text-slate-100">What is claimed, and what is
              not.</strong> The claim is an existence claim: that reliability
              evaluation can be moved from offline assessment into runtime
              assurance, and that a working system demonstrates it. It is not a
              claim of superiority over any alternative — no controlled
              comparison against other frameworks has been run, so no such
              claim would be supportable.
            </p>
            <p>
              Related work worth reading alongside this: Rabanser et al. on a
              science of agent reliability, which names online monitoring and
              intervention as open problems; and the broader literature on
              agent benchmarks, which measures task completion rather than
              behaviour under fault.
            </p>
            <a href="https://github.com/hb-evalSystem/HB-System" target="_blank"
               rel="noopener noreferrer"
               className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1">
              Reproduction repository <ArrowRight size={12} />
            </a>
          </Section>

          <Section id="limits" title="What this does not do"
                   kicker="Honest Boundaries" icon={<AlertTriangle size={13} />}>
            <p>
              Stated plainly, because finding these out during an incident is
              worse than reading them now.
            </p>

            <ul>
              <li>
                <strong className="text-slate-100">It does not judge
                correctness.</strong> A confidently wrong answer delivered
                without errors scores well on every metric here. These measure
                behavioural reliability under fault, not truth.
              </li>
              <li>
                <strong className="text-slate-100">It cannot undo anything.</strong>{' '}
                Safe Halt stops the next step; it does not reverse the previous
                one. If your agent has already sent the email, the email is sent.
              </li>
              <li>
                <strong className="text-slate-100">It is cooperative.</strong>{' '}
                A halt raises a flag your loop must check. An agent that ignores{' '}
                <code className="code-inline">should_halt</code> will not stop —
                which is the correct trade, since a library that could kill a
                process mid-transaction would be more dangerous than the problem
                it solves.
              </li>
              <li>
                <strong className="text-slate-100">Derived metrics have a
                floor, not a ceiling.</strong> Signals derived from
                OpenTelemetry spans see mechanical failures only. Silent failures
                are invisible to them.
              </li>
              <li>
                <strong className="text-slate-100">CSI needs repeated
                runs.</strong> Consistency cannot be measured inside a single
                session and is reported as undefined there, never as zero.
              </li>
              <li>
                <strong className="text-slate-100">A passport is not an
                audit.</strong> It records what was observed and signs the
                record. HB-Eval is not an accreditation body and issues no
                certification.
              </li>
              <li>
                <strong className="text-slate-100">Service is best-effort.</strong>{' '}
                A single instance in one region, no redundancy, no uptime
                guarantee. See{' '}
                <Link href="/status" className="text-blue-400 hover:text-blue-300">
                  status
                </Link>{' '}
                for what is actually committed.
              </li>
            </ul>

            <p>
              A project arguing that reliability claims should be measured rather
              than asserted is a poor place to start making unmeasured ones.
            </p>
          </Section>



        </div>
      </div>
    </div>
  )
}
