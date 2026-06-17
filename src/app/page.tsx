'use client'
// app/page.tsx — Landing page
// This is a Client Component because of scroll effects and interactive elements.
// All sections are static marketing content — no auth or data fetching here.

import Link from 'next/link'
import { Shield, Zap, Brain, BarChart2, Clock, ChevronRight, ArrowRight, Github, ExternalLink, Database, Lightbulb } from 'lucide-react'

// ─────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
         style={{ background: 'rgba(6,12,24,0.85)', backdropFilter: 'blur(16px)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Link href="/" className="flex items-center gap-2 font-semibold text-white text-lg">
        <Shield size={22} className="text-blue-500" />
        <span>HB-Eval <span className="text-blue-500">OS</span></span>
      </Link>

      <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
        <a href="#metrics"   className="hover:text-white transition-colors">Metrics</a>
        <a href="#memory"    className="hover:text-white transition-colors">Memory</a>
        <a href="#proof"     className="hover:text-white transition-colors">Live Proof</a>
        <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
        <a href="https://github.com/hb-evalSystem/HB-System" target="_blank" rel="noopener"
           className="hover:text-white transition-colors flex items-center gap-1">
          <Github size={14} /> GitHub
        </a>
        <a href="https://hbeval-verify-hxkrf5egzvp5qmvhs5wqcq.streamlit.app/" target="_blank" rel="noopener"
           className="hover:text-white transition-colors flex items-center gap-1">
          <ExternalLink size={14} /> Verify Paper
        </a>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login"    className="btn-secondary text-sm px-4 py-2">Sign in</Link>
        <Link href="/register" className="btn-primary  text-sm px-4 py-2">Start free</Link>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-36 pb-24 px-6 text-center overflow-hidden">
      {/* Glow orb */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(37,99,235,0.18), transparent)' }} />

      <div className="relative max-w-4xl mx-auto animate-slide-up">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 mb-6
                        px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/08">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-slow" />
          Open Beta — 500 free evaluations / month
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
          The Reliability{' '}
          <span style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)',
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Operating System
          </span>
          <br />for Agentic AI
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Not "did the agent succeed?" — but{' '}
          <em className="text-slate-200 not-italic">does it succeed reliably</em>,
          recover intentionally, and remain stable over time?
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="btn-primary text-base px-6 py-3 gap-2">
            Start free <ArrowRight size={16} />
          </Link>
          <Link href="https://github.com/hb-evalSystem/HB-System" target="_blank" rel="noopener"
                className="btn-secondary text-base px-6 py-3 gap-2">
            <Github size={16} /> View on GitHub
          </Link>
        </div>

        {/* Quick install snippet */}
        <div className="mt-8 inline-flex items-center gap-3 text-sm font-mono
                        px-4 py-2 rounded-lg border"
             style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)',
                      color: '#93c5fd' }}>
          pip install hb-eval-sdk
          <span className="text-slate-500">·</span>
          <span className="text-slate-400 font-sans font-normal">v2.1.0 on PyPI</span>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Live Proof — the most powerful section on the page
// ─────────────────────────────────────────────────────────
function LiveProof() {
  return (
    <section id="proof" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="card p-8 border-red-500/20"
             style={{ background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-start gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-red-400 mt-2 animate-pulse-slow" />
            <div>
              <p className="section-label text-red-400 mb-1">Live Production Data</p>
              <h2 className="text-2xl font-bold text-white">The Gap Is Real — And We Have Proof</h2>
            </div>
          </div>

          <p className="text-slate-400 mb-8 max-w-2xl leading-relaxed">
            Our first real production run — unplanned, unstyled — showed exactly
            what the research paper describes. Three metrics at theoretical maximum.
            One below Tier 1. Not tier-qualified.
          </p>

          {/* Metrics grid */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: 'PEI', value: '1.000', status: 'perfect', desc: 'Planning Efficiency' },
              { label: 'IRS', value: '1.000', status: 'perfect', desc: 'Intentional Recovery' },
              { label: 'FRR', value: '1.000', status: 'perfect', desc: 'Fault Resilience' },
              { label: 'TI',  value: '2.30',  status: 'fail',    desc: 'Traceability / 5.0' },
              { label: 'CSI', value: 'N/A',   status: 'na',      desc: 'Consistency Stability' },
            ].map(m => (
              <div key={m.label} className="card p-4 text-center"
                   style={{ borderColor: m.status === 'fail' ? 'rgba(239,68,68,0.30)' :
                            m.status === 'perfect' ? 'rgba(16,185,129,0.20)' :
                            'rgba(255,255,255,0.08)' }}>
                <div className="text-xs text-slate-500 mb-1">{m.label}</div>
                <div className={`text-2xl font-bold font-mono mb-1 ${
                  m.status === 'perfect' ? 'text-emerald-400' :
                  m.status === 'fail'    ? 'text-red-400'     : 'text-slate-500'
                }`}>{m.value}</div>
                <div className="text-xs text-slate-600">{m.desc}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg p-4 text-sm"
               style={{ background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid #ef4444' }}>
            <strong className="text-red-300">Result: Not tier-qualified.</strong>
            <span className="text-slate-400 ml-2">
              Despite perfect quantitative scores, TI = 2.30 / 5.0 falls below the Tier 1 threshold of 3.0.
              The agent's reasoning was not traceable enough to qualify for autonomous deployment.
              This is the nominal-operational gap the paper describes — appearing unprompted in real data.
            </span>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <a href="https://hb-system-fffjnvukwgqxcuyu7t7ylh.streamlit.app/"
               target="_blank" rel="noopener" className="btn-secondary text-sm">
              <ExternalLink size={14} /> Live Dashboard
            </a>
            <a href="https://hbeval-verify-hxkrf5egzvp5qmvhs5wqcq.streamlit.app/"
               target="_blank" rel="noopener" className="btn-secondary text-sm">
              <ExternalLink size={14} /> Verify Paper Results
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// The Five Metrics
// ─────────────────────────────────────────────────────────
const METRICS = [
  { icon: Zap,      label: 'FRR', name: 'Failure Resilience Rate',
    desc: 'How well does the agent recover when something breaks? Measures recovery quality on a 4-level expert-calibrated rubric — not just whether it recovered, but how intelligently.',
    tier1: '≥ 0.70', tier2: '≥ 0.85', tier3: '≥ 0.95', color: '#10b981' },
  { icon: BarChart2, label: 'PEI', name: 'Planning Efficiency Index',
    desc: 'Does the agent reach its goal in the minimum necessary steps? Penalises wasted actions and constraint violations (γ = 0.20 per violation, calibrated on a 200-episode corpus).',
    tier1: '≥ 0.70', tier2: '≥ 0.80', tier3: '≥ 0.90', color: '#3b82f6' },
  { icon: Brain,    label: 'IRS', name: 'Intentional Recovery Score',
    desc: "When the agent recovers from a fault, was it guided by memory of a past similar situation — or random trial-and-error? Intentional recoveries maintain 89% success under novel faults; stochastic ones collapse to 34%.",
    tier1: '≥ 0.60', tier2: '≥ 0.75', tier3: '≥ 0.90', color: '#7c3aed' },
  { icon: Shield,   label: 'TI',  name: 'Traceability Index',
    desc: 'Can you follow the reasoning? GPT-4o acts as a calibrated judge (Pearson r = 0.89, κ = 0.82) rating execution trace coherence on a 1–5 scale. The only metric that catches subtle reasoning degradation.',
    tier1: '≥ 3.0',  tier2: '≥ 4.0',  tier3: '≥ 4.5',  color: '#f59e0b' },
  { icon: Clock,    label: 'CSI', name: 'Consistency Stability Index',
    desc: 'Does the agent stay reliable over thousands of runs — or does performance drift? Combines variance in PEI/IRS with a failure trend slope. The early-warning system for agents that are slowly degrading.',
    tier1: '≥ 0.70', tier2: '≥ 0.80', tier3: '≥ 0.90', color: '#ec4899' },
]

function MetricsSection() {
  return (
    <section id="metrics" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="section-label mb-3">The Science</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            Five Dimensions of Reliability
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Interpreted against IEC 61508 and ISO 26262 safety-integrity levels (for rigor comparison only — HB-Eval issues no such certification).
            All five must be met simultaneously — the weakest link determines the tier.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {METRICS.map(({ icon: Icon, label, name, desc, tier1, tier2, tier3, color }) => (
            <div key={label} className="card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold" style={{ color }}>{label}</span>
                  <div className="text-sm font-semibold text-white">{name}</div>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{desc}</p>
              <div className="flex gap-2 text-xs">
                {[['T1', tier1, '#64748b'], ['T2', tier2, '#3b82f6'], ['T3', tier3, '#7c3aed']].map(
                  ([t, v, c]) => (
                    <div key={t} className="rounded px-2 py-1 font-mono"
                         style={{ background: `${c}15`, color: c as string, border: `1px solid ${c}25` }}>
                      {t}: {v}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Weakest-link rule callout */}
          <div className="card p-6 md:col-span-2 lg:col-span-1"
               style={{ borderColor: 'rgba(37,99,235,0.25)', background: 'rgba(37,99,235,0.06)' }}>
            <div className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <Shield size={16} /> Weakest-Link Rule
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              An agent scoring Tier 3 on four metrics but Tier 1 on IRS receives{' '}
              <strong>Meets Tier 1 only</strong>. High aggregate reliability cannot
              conceal a specific deficit — the same principle used in aircraft and automotive
              safety standards.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// How it works
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Two evaluation paths
// ─────────────────────────────────────────────────────────
function EvaluationPaths() {
  return (
    <section id="paths" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-label mb-3">Two Ways to Evaluate</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            Run it yourself, or let the platform verify it
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Both paths run the same fault-injection battery and score all five metrics
            server-side. The difference is who executes the run.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-7">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-white">Local battery</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>Free</span>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              The battery runs on your machine through the SDK. Your agent never leaves your
              environment — only its responses are sent for scoring. You get a JSON report
              locally. Results are marked <em>unverified</em>.
            </p>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li>• <code className="text-slate-300">pip install hb-eval-sdk</code></li>
              <li>• Call <code className="text-slate-300">evaluate_with_battery()</code></li>
              <li>• Full metrics + guidance, no payment</li>
            </ul>
          </div>
          <div className="card p-7" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-white">Verified</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' }}>Paid</span>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              The platform calls your agent endpoint end-to-end across the battery — you never
              touch the middle, so the result cannot be tampered with. Marked <em>verified</em>,
              and eligible for a reliability-tier qualification.
            </p>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li>• Platform-run, tamper-proof</li>
              <li>• SSRF-guarded, consent-required</li>
              <li>• Meets Tier 1 / 2 / 3 qualification</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Install the SDK', body: 'pip install hb-eval-sdk — one command, zero infrastructure setup required.' },
    { n: '02', title: 'Choose your path', body: 'Local battery (free): run the fault-injection battery on your own machine with the SDK — your agent never leaves your environment. Verified (paid): the platform calls your agent endpoint end-to-end for a tamper-proof result.' },
    { n: '03', title: 'Run the fault-injection battery', body: 'Your agent is subjected to six fault types (tool failure, context corruption, stochastic, adversarial, cascade, combined) across six domains — far beyond a single happy-path run.' },
    { n: '04', title: 'Get your verdict', body: 'Receive all five metrics — PEI, FRR, IRS, TI, CSI — the reliability gap (nominal vs under-fault), a SAFE / UNSAFE verdict, and the highest reliability tier met.' },
    { n: '05', title: 'Monitor and qualify', body: 'Track trends across your agents. Once 100 runs consistently clear all five thresholds, your agent earns a Tier qualification (an internal performance classification, not an accredited certificate).' },
  ]

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Get Started</p>
          <h2 className="text-4xl font-bold text-white">From zero to qualified in five steps</h2>
        </div>
        <div className="space-y-4">
          {steps.map(({ n, title, body }) => (
            <div key={n} className="card p-5 flex items-start gap-5">
              <div className="text-3xl font-bold font-mono text-slate-700 w-10 shrink-0">{n}</div>
              <div>
                <div className="font-semibold text-white mb-1">{title}</div>
                <div className="text-sm text-slate-400">{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Pricing teaser
// ─────────────────────────────────────────────────────────
function PricingTeaser() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="card p-10 text-center"
             style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))',
                      borderColor: 'rgba(37,99,235,0.20)' }}>
          <h2 className="text-3xl font-bold text-white mb-4">Start evaluating today — free</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            500 evaluations per month, full SDK access, live dashboard. No credit card required.
            Verified evaluation and reliability-tier qualification unlock with Pro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1">
              View all plans <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t py-12 px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Shield size={18} className="text-blue-500" />
          HB-Eval <span className="text-blue-500">OS</span>
          <span className="text-slate-600 font-normal text-sm ml-2">v2.1.0</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
          <a href="https://github.com/hb-evalSystem/HB-System" target="_blank" rel="noopener"
             className="hover:text-slate-300 transition-colors">GitHub</a>
          <a href="https://pypi.org/project/hb-eval-sdk/" target="_blank" rel="noopener"
             className="hover:text-slate-300 transition-colors">PyPI</a>
          <a href="https://hbeval-verify-hxkrf5egzvp5qmvhs5wqcq.streamlit.app/" target="_blank" rel="noopener"
             className="hover:text-slate-300 transition-colors">Verify Results</a>
          <Link href="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
          <a href="mailto:gasimadam119@gmail.com" className="hover:text-slate-300 transition-colors">Contact</a>
        </div>

        <div className="text-xs text-slate-600">
          © 2026 HB-Eval · MIT License
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Reliability Memory — the two governed-memory layers (EDM + HCI-EDM)
// A real, deployed achievement: not just metrics, but a memory that is
// governed by those metrics, and explanations grounded in it.
// ─────────────────────────────────────────────────────────
function MemoryLayers() {
  return (
    <section id="memory" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="section-label mb-3">Beyond Scoring</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            A memory governed by reliability — and explanations grounded in it
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Most systems remember everything and explain with confident guesses.
            HB-Eval does the opposite: it remembers only what proved reliable,
            and it explains only what it can ground in a qualified record.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Layer 1 — EDM */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(16,185,129,0.12)' }}>
                <Database size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="section-label text-emerald-400 mb-0.5">Layer 1 · EDM</p>
                <h3 className="text-white font-semibold">Quality-governed memory</h3>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Every run is judged before it is remembered. A trajectory is
              consolidated into qualified memory only when it clears
              <span className="text-emerald-300"> PEI ≥ 0.80 and TI ≥ 4.0</span> at
              the same time. Everything else is discarded as noise — so the store
              never fills with low-quality runs.
            </p>
            <div className="text-xs text-slate-500 font-mono rounded-lg px-3 py-2"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              if PEI ≥ 0.80 and TI ≥ 4.0 → consolidate · else → discard
            </div>
          </div>

          {/* Layer 2 — HCI-EDM */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(139,92,246,0.14)' }}>
                <Lightbulb size={18} style={{ color: '#c4b5fd' }} />
              </div>
              <div>
                <p className="section-label mb-0.5" style={{ color: '#c4b5fd' }}>Layer 2 · HCI-EDM</p>
                <h3 className="text-white font-semibold">Performance-grounded explanations</h3>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Ask <span style={{ color: '#c4b5fd' }}>why</span> a verdict stands, and
              the system answers from the record — citing a specific qualified
              episode and its real metrics. When no precedent is similar enough,
              it does not invent a rationale: it honestly defers to human review.
            </p>
            <div className="text-xs text-slate-500 font-mono rounded-lg px-3 py-2"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              cite episode if similarity ≥ 0.87 · else → defer to human
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8 max-w-2xl mx-auto">
          Both layers are live in production and documented against the
          peer-reviewed research they implement (EDM &amp; HCI-EDM).
        </p>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LiveProof />
        <MetricsSection />
        <EvaluationPaths />
        <MemoryLayers />
        <HowItWorks />
        <PricingTeaser />
      </main>
      <Footer />
    </>
  )
}
