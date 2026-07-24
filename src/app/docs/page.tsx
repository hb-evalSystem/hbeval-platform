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
import {
  BookOpen, ArrowLeft, Play, Activity, OctagonX, Telescope, Bot, Terminal,
  ArrowRight, ChevronRight, KeyRound, Beaker, ShieldCheck, MessageSquare,
  Layers, GitBranch,
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
  { href: '#observatory', label: 'Observatory' },
  { href: '#mcp', label: 'MCP' },
  { href: '#journey', label: 'Full walkthrough' },
  { href: '#compare', label: 'Which one do I use?' },
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
                <Code lang="bash">pip install hb-eval-sdk</Code>
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

        </div>
      </div>
    </div>
  )
}
