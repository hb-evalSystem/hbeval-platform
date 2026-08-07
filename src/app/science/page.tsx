// src/app/science/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Scientific validation.
//
// WHY THIS PAGE
// The DOIs, the metric definitions, the reproduction repository and the
// methodology all exist — scattered across a documentation section, a footer
// link and a preprint server. A researcher evaluating whether this is serious
// work had to assemble that themselves, and most will not.
//
// THE HARDER PART: SAYING WHAT IS NOT PROVEN
// An external review scored the published evidence 6/10, and it was right to.
// No controlled comparison against other frameworks has been run, so no claim
// of superiority is supportable. That is stated here plainly rather than left
// for a reviewer to discover, because a page that overstates its evidence is
// exactly the failure this project exists to argue against — and because a
// stated limitation is a research agenda, while a discovered one is a
// credibility problem.
import Link from 'next/link'
import {
  ArrowLeft, FileText, ExternalLink, GitBranch, AlertTriangle, Sigma,
} from 'lucide-react'

export const metadata = {
  title: 'Scientific Validation — HB-Eval',
  description:
    'Metric definitions, published papers, the reproduction repository, and an '
    + 'honest account of what has and has not been demonstrated.',
}

const AUTHOR = 'Abuelgasim Mohamed Ibrahim Adam'
const ORCID = '0009-0000-7013-1493'

const PAPERS = [
  {
    role: 'Primary manuscript',
    title: 'HB-Eval — The Reliability Gap: A Multi-Metric Framework and '
         + 'Triple-Methodology for Evaluating Operational Reliability in '
         + 'Agentic AI Systems',
    doi: '10.20944/preprints202606.0186.v1',
    status: 'Preprint · under review',
    note: 'Defines the metrics, the fault taxonomy, and the three evaluation '
        + 'methodologies.',
  },
  {
    role: 'Companion',
    title: 'Adapt-Plan: Planning efficiency as a live control signal',
    doi: '10.20944/preprints202601.0038.v1',
    status: 'Preprint',
    note: 'PEI used during execution rather than after it — re-planning is '
        + 'triggered when the metric falls below 0.70.',
  },
  {
    role: 'Companion',
    title: 'EDM: Evaluation-Driven Memory',
    doi: '10.20944/preprints202601.0195.v1',
    status: 'Preprint',
    note: 'A memory admitting only trajectories that clear PEI ≥ 0.80 and '
        + 'TI ≥ 4.0, retrieved above cosine similarity 0.87.',
  },
  {
    role: 'Companion',
    title: 'HCI-EDM: Performance-grounded explanation',
    doi: '10.20944/preprints202601.0896.v1',
    status: 'Preprint',
    note: 'Explanations cite qualified stored episodes and quote figures from '
        + 'the record; absent a precedent, the system defers to a human.',
  },
] as const

const METRICS = [
  ['PEI', 'Planning Efficiency Index',
   '1 − (re-plans / steps)',
   'Repeated re-planning indicates the plan is not holding. Bounded below at 0.'],
  ['FRR', 'Failure Resilience Rate',
   'steps that succeeded despite a fault / steps with a fault',
   'Undefined when no fault has occurred. Resilience cannot be scored against '
   + 'an absence of adversity.'],
  ['IRS', 'Intentional Recovery Score',
   'deliberate recoveries / recoveries judged',
   'Undefined where no recovery judgement was supplied. Separates reasoned '
   + 'adaptation from blind repetition.'],
  ['TI', 'Traceability Index',
   '5 × (traceable steps / steps)',
   'Scaled 0–5 rather than 0–1, matching the auditability scale used in the '
   + 'manuscript.'],
  ['CSI', 'Consistency Stability Index',
   'stability of behaviour across repeated runs of the same task',
   'Requires repeated runs. Undefined within a single session, and reported as '
   + 'undefined rather than zero.'],
] as const

export default function SciencePage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        <h1 className="text-3xl font-bold text-white mb-3">Scientific validation</h1>
        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-10">
          The metric definitions, the published work behind them, the code that
          reproduces the results — and a direct account of what has not been
          demonstrated yet.
        </p>

        {/* ── Papers ── */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Published work</h2>
          <div className="space-y-3">
            {PAPERS.map(p => (
              <div key={p.doi} className="card p-5">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: 'rgba(59,130,246,0.14)', color: '#93c5fd' }}>
                    {p.role}
                  </span>
                  <span className="text-[11px] text-slate-500">{p.status}</span>
                </div>
                <p className="text-sm text-slate-100 leading-snug mb-2">{p.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{p.note}</p>
                <a href={`https://doi.org/${p.doi}`} target="_blank"
                   rel="noopener noreferrer"
                   className="text-[11px] font-mono text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                  {p.doi} <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            {AUTHOR} · ORCID{' '}
            <a href={`https://orcid.org/${ORCID}`} target="_blank"
               rel="noopener noreferrer"
               className="text-blue-400 hover:text-blue-300 font-mono">
              {ORCID}
            </a>
          </p>
        </section>

        {/* ── Definitions ── */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Sigma size={17} className="text-purple-400" /> Metric definitions
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            These are the live-monitoring forms, computed per step by the SDK.
            The manuscript&rsquo;s battery scoring uses the same quantities over a
            full fault battery rather than a single session.
          </p>
          <div className="space-y-3">
            {METRICS.map(([key, name, formula, note]) => (
              <div key={key} className="card p-4">
                <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
                  <span className="text-sm font-mono text-blue-400">{key}</span>
                  <span className="text-sm text-slate-100">{name}</span>
                </div>
                <code className="block text-[11px] font-mono text-slate-300 rounded px-3 py-2 mb-2"
                      style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {formula}
                </code>
                <p className="text-[11px] text-slate-400 leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
          <div className="card p-4 mt-3" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-slate-100">Undefined is never zero.</strong>{' '}
              Three of the five are genuinely undefined under common conditions,
              and are propagated as null through the SDK, the wire protocol, the
              database and every chart. Substituting zero would assert a measured
              failure on a dimension nothing examined — and a CI gate or an
              auditor reading that zero would act on it.
            </p>
          </div>
        </section>

        {/* ── Reproduction ── */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <GitBranch size={17} className="text-emerald-400" /> Reproduction
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            The reference implementation is Python with no external dependencies
            in its core, so it runs in constrained environments. It contains the
            metric computation, the three methodologies, the dataset, and the
            test suite.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            The fault specification carries a fingerprint —{' '}
            <code className="code-inline">ce481b32763df1ca</code> — that changes
            if the specification changes. Two results produced under different
            fingerprints were not measured against the same battery and should
            not be compared, however similar the numbers look.
          </p>
          <a href="https://github.com/hb-evalSystem/HB-System" target="_blank"
             rel="noopener noreferrer"
             className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5">
            <FileText size={13} /> HB-System repository <ExternalLink size={11} />
          </a>
        </section>

        {/* ── The honest section ── */}
        <section className="mb-12">
          <div className="card p-5" style={{ borderColor: 'rgba(251,191,36,0.35)' }}>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={17} className="text-amber-400" />
              What has not been demonstrated
            </h2>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                <strong className="text-slate-100">The claim is existence, not
                superiority.</strong> This work demonstrates that reliability
                evaluation can move from offline assessment into runtime
                assurance, and that a working system does it. No controlled
                comparison against other evaluation frameworks has been run, so
                no claim that HB-Eval measures better than any alternative would
                be supportable — and none is made.
              </p>
              <p>
                <strong className="text-slate-100">CSI remains provisional.</strong>{' '}
                Consistency requires many repeated runs of the same task to
                measure meaningfully. Until that data exists at scale, CSI is
                reported as undefined far more often than it is reported as a
                number.
              </p>
              <p>
                <strong className="text-slate-100">The thresholds are a starting
                point, not a finding.</strong> PEI 0.70, FRR 0.65, IRS 0.60,
                TI 3.00 come from the reference implementation. They are not
                empirically derived from a population of production agents,
                because no such population has been measured. Teams are told to
                derive their own from their own distribution.
              </p>
              <p>
                <strong className="text-slate-100">Construct validity is
                argued, not proven.</strong> That PEI captures planning
                efficiency, or that IRS distinguishes reasoned recovery from
                blind retry, rests on the definitions and on inspection of
                traces — not on an independent criterion these were validated
                against. Establishing that is the most important open problem in
                this work.
              </p>
              <p>
                <strong className="text-slate-100">The primary manuscript is
                under review.</strong> The preprints are public and citable;
                none has completed peer review.
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              A project arguing that reliability claims must be measured rather
              than asserted has no standing to overstate its own evidence. These
              are the open problems, and they are the agenda.
            </p>
          </div>
        </section>

        {/* ── Related work ── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-3">Related work</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            Rabanser and colleagues argue for a science of agent reliability and
            name online monitoring and intervention as open problems — the gap
            this system builds into. The wider agent-benchmark literature
            measures task completion under nominal conditions, which is a
            different question and a necessary one.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            HB-Eval does not replace LangGraph, CrewAI or AutoGen. Those build
            agents; this measures how the agents they build behave when things
            break.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/architecture" className="btn-secondary text-xs px-4 py-2">
            Architecture
          </Link>
          <Link href="/docs#metrics" className="btn-secondary text-xs px-4 py-2">
            Metrics in the documentation
          </Link>
          <Link href="/demo" className="btn-secondary text-xs px-4 py-2">
            See them computed
          </Link>
        </div>
      </div>
    </div>
  )
}
