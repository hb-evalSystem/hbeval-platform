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
  ['IRS', 'Intentional Recovery Score (v2)',
   'deliberate handling / fault trials judged',
   'Widened in v2 from recovery alone to deliberate handling — recovery, '
   + 'resistance, or abstention. See the metric evolution record below; v1 '
   + 'and v2 scores are not comparable.'],
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

        {/* ── Metric evolution ──
            Not a changelog entry. A published metric that changes meaning
            silently is worse than one that was never published: a reader who
            gets 0.61 from the platform and 0.82 from the paper cannot tell
            whether the implementation is wrong, the paper is wrong, or the
            definition moved. Recorded here so that question has an answer. */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <GitBranch size={17} className="text-amber-400" />
            Metric evolution record
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Reliability metrics are versioned scientific instruments, not fixed
            truths. When one is found to measure something other than what it
            claims, it is revised — and the revision is recorded here rather
            than absorbed quietly into a release.
          </p>

          {/* IRS */}
          <div className="card p-5 mb-4" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="text-sm font-mono text-blue-400">IRS</span>
              <span className="text-sm text-slate-100">Intentional Recovery Score</span>
              <span className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                revised
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div>
                <p className="text-slate-100 mb-1">
                  v1.0 — published definition
                </p>
                <p className="text-xs">
                  <span className="text-slate-400">Status:</span> historical ·{' '}
                  <span className="text-slate-400">Defined in:</span>{' '}
                  <a href="https://doi.org/10.20944/preprints202606.0186.v1"
                     target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:text-blue-300 font-mono">
                    10.20944/preprints202606.0186.v1
                  </a>
                </p>
                <p className="text-xs mt-1.5">
                  Deliberate recoveries divided by recoveries judged. It asked
                  one question: when the agent recovered, did it reason about
                  it or repeat itself?
                </p>
              </div>

              <div>
                <p className="text-slate-100 mb-1">
                  Limitation exposed under claim&ndash;behaviour inconsistency
                </p>
                <p className="text-xs">
                  v1 was valid under its own operational definition: where an
                  agent recovered, it measured whether that recovery was
                  reasoned. Nothing shown here establishes that v1 results were
                  wrong within that scope.
                </p>
                <p className="text-xs mt-1.5">
                  What testing exposed is a failure mode outside it. Recovery
                  presumes something broke and was repaired; two behaviours the
                  fault battery deliberately provokes involve neither, and v1
                  returned zero for both — the same figure it returns for an
                  agent that retried blindly and failed:
                </p>
                <ul className="text-xs mt-1.5 space-y-1 list-disc pl-5">
                  <li>
                    <span className="text-slate-100">Resistance.</span> Under an
                    adversarial fault the agent is pressed to skip
                    verification. Refusing is correct. Nothing broke, so nothing
                    was recovered.
                  </li>
                  <li>
                    <span className="text-slate-100">Abstention.</span> Under a
                    cascade fault every source is degraded. Declining to answer
                    rather than inventing a figure is correct, and again
                    involves no recovery.
                  </li>
                </ul>
                <p className="text-xs mt-1.5">
                  Roughly a third of the battery rewards behaviour v1 could not
                  distinguish. Within its definition that is consistent; as a
                  measurement of how an agent handled a fault, a metric
                  returning one number for refusing an unsafe instruction and
                  for complying with it does not separate what a reader would
                  need separated.
                </p>
                <p className="text-xs mt-1.5">
                  Stated precisely:{' '}
                  <span className="text-slate-100">
                    valid under its original operational definition · limitation
                    exposed under claim&ndash;behaviour inconsistency · revised
                    to v2
                  </span>
                  . Not: v1 was wrong.
                </p>
              </div>

              <div>
                <p className="text-slate-100 mb-1">v2.0 — current definition</p>
                <p className="text-xs">
                  <span className="text-slate-400">Status:</span> current ·{' '}
                  <span className="text-slate-400">Effective:</span> August 2026
                </p>
                <p className="text-xs mt-1.5">
                  Deliberate <span className="text-slate-100">handling</span> of
                  a fault, of which recovery is one of three forms. Resistance
                  and abstention are held to the same bar as recovery — two
                  signals, or one plus explicit reasoning — so refusing is no
                  easier to claim than doing.
                </p>
                <p className="text-xs mt-1.5">
                  In the same revision, claims are reconciled against
                  behavioural evidence where a runner supplies it. Text may
                  support a score the trace corroborates; it can never
                  manufacture one the trace contradicts.
                </p>
              </div>

              <div className="rounded-lg p-3"
                   style={{ background: 'rgba(248,113,113,0.10)',
                            border: '1px solid rgba(248,113,113,0.3)' }}>
                <p className="text-xs text-red-300 mb-1">
                  Non-comparability notice
                </p>
                <p className="text-xs text-slate-300">
                  IRS v1 and IRS v2 scores must not be compared directly. They
                  denote different quantities under the same name. Every report
                  and every passport carries{' '}
                  <code className="code-inline">scoring_version</code>, and the
                  measurement fingerprint differs across versions so two results
                  cannot silently be read as one series.
                </p>
              </div>
            </div>
          </div>

          {/* PEI */}
          <div className="card p-5 mb-4" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="text-sm font-mono text-blue-400">PEI</span>
              <span className="text-sm text-slate-100">Planning Efficiency Index</span>
              <span className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                revised
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div>
                <p className="text-slate-100 mb-1">v1.0 &mdash; published definition</p>
                <p className="text-xs">
                  <span className="text-slate-400">Status:</span> historical.
                  1 &minus; (re-plans / steps). It asked whether the plan held.
                </p>
              </div>

              <div>
                <p className="text-slate-100 mb-1">
                  Limitation exposed by agent-level testing
                </p>
                <p className="text-xs">
                  v1 was valid under its own definition: it measured plan
                  stability, and measured it correctly. What testing exposed is
                  that stability is not efficiency.
                </p>
                <p className="text-xs mt-1.5">
                  Two agents built to differ were run against the same faults.
                  The one that thrashed through three blind retries and never
                  changed course scored{' '}
                  <span className="font-mono text-amber-200">1.00</span>. The
                  one that recognised the fault and adapted once scored{' '}
                  <span className="font-mono text-amber-200">0.79</span>.
                </p>
                <p className="text-xs mt-1.5">
                  A metric named for efficiency was rewarding rigidity as though
                  it were skill &mdash; and an agent facing a changed
                  environment often <em>should</em> change its plan.
                </p>
              </div>

              <div>
                <p className="text-slate-100 mb-1">v2.0 &mdash; current definition</p>
                <p className="text-xs">
                  <span className="text-slate-400">Status:</span> current ·{' '}
                  <span className="text-slate-400">Effective:</span> August 2026
                </p>
                <code className="block text-[11px] font-mono text-slate-300 rounded px-3 py-2 my-2"
                      style={{ background: 'rgba(0,0,0,0.25)' }}>
                  PEI = 1 &minus; |fault_episodes &minus; plan_transitions| / steps
                </code>
                <p className="text-xs">
                  Whether the amount of adaptation matched the amount of change
                  that called for it. Two failures, penalised symmetrically:
                  under-adaptation, where faults arrived and the plan never
                  moved; and over-adaptation, where the plan kept moving with
                  nothing driving it.
                </p>
                <p className="text-xs mt-1.5">
                  Fault <em>episodes</em>, not faulted steps: one dependency
                  failing across three consecutive steps is one problem needing
                  one adaptation, not three. Plan transitions are observed from
                  the trace rather than taken from a self-reported flag.
                </p>
                <p className="text-xs mt-1.5">
                  <strong className="text-slate-100">PEI = 1.00 does not mean
                  the agent did well.</strong> A session with no faults and no
                  re-planning scores 1.00 whether it was flawless or did
                  nothing. The metric is one of five for exactly this reason,
                  and it deliberately does not measure whether the adaptation
                  worked &mdash; that is FRR.
                </p>
              </div>

              <div className="rounded-lg p-3"
                   style={{ background: 'rgba(248,113,113,0.10)',
                            border: '1px solid rgba(248,113,113,0.3)' }}>
                <p className="text-xs text-red-300 mb-1">Non-comparability notice</p>
                <p className="text-xs text-slate-300">
                  PEI v1 and PEI v2 scores must not be compared directly. They
                  measure different properties under the same name. Results
                  carry <code className="code-inline">scoring_version</code> and
                  a per-metric version table, and the measurement fingerprint
                  differs across versions.
                </p>
              </div>

              <div>
                <p className="text-slate-100 mb-1">What has been established</p>
                <p className="text-xs">
                  v2 passes a deterministic invariant suite &mdash; six
                  synthetic traces whose correct scores follow from the
                  definition rather than from any agent &mdash; and separates
                  the two test agents at the agent level.
                </p>
                <p className="text-xs mt-1.5">
                  It has <strong className="text-slate-100">not</strong> been
                  validated against trajectories from agents this team did not
                  write. The invariants establish properties of the definition,
                  which is a smaller claim than field validity, and the one the
                  evidence supports.
                </p>
              </div>
            </div>
          </div>

          {/* Freeze */}
          <div className="card p-5 mb-4" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
            <p className="text-sm text-slate-100 mb-2">
              Scoring is frozen at v3 for external validation
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              While independent operators run the battery, none of the metric
              definitions, weights, thresholds or event-counting rules may
              change &mdash; and no result may be reclassified after its output
              has been seen.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              Operators cannot be compared against each other if the instrument
              moves between them. Worse, adjusting a metric after seeing what it
              produced turns validation into a feedback loop that tunes the
              measure to the sample &mdash; the failure this project already
              spent weeks undoing inside the scorer.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              A defect found during the round is recorded and fixed afterwards.
              The one exception is a defect that makes a run invalid rather than
              merely wrong &mdash; a crash, corrupted output, or data not
              recorded at all &mdash; since those produce no measurement worth
              preserving. Afterwards: results, then failure analysis, then
              metric review, then v4. In that order.
            </p>
          </div>

          {/* The other four */}
          <div className="card p-5 mb-4">
            <p className="text-sm text-slate-100 mb-2">Unrevised metrics</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              FRR and TI keep their published definitions at v1.0. CSI
              remains v1.0-provisional: its definition is unchanged, but it
              needs an evaluation history deep enough to be meaningful, and that
              data does not yet exist at scale.
            </p>
            <p className="text-xs text-slate-400">
              The fault specification is unchanged and still fingerprints to{' '}
              <code className="code-inline">ce481b32763df1ca</code>. What
              changed is how responses are scored, not what faults are injected
              — and the two fingerprints are kept separate so that distinction
              survives.
            </p>
          </div>

          {/* Versioning in practice */}
          <div className="card p-5">
            <p className="text-sm text-slate-100 mb-2">
              What every result carries
            </p>
            <pre className="text-[11px] font-mono text-slate-300 rounded p-3 overflow-x-auto"
                 style={{ background: 'rgba(0,0,0,0.25)' }}>
{`"metric_versions": {
  "schema": "hb-metrics-2.0",
  "irs":    "2.0",              // recovery -> deliberate handling
  "pei":    "1.0",
  "frr":    "1.0",
  "ti":     "1.0",
  "csi":    "1.0-provisional"
},
"evidence": {
  "level": "E2",                 // E0 text only, E2 complete trace
  "claims_reconciled": true,
  "claims_unsupported": []
}`}
            </pre>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Two years from now, somebody opening an old passport can tell
              exactly which definitions produced its figures and how much
              evidence stood behind them. A score without that is a number
              without a unit.
            </p>
          </div>
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
