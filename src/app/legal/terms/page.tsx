// src/app/legal/terms/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Terms of service.
//
// WHY THESE ARE SHORTER THAN A SAAS TEMPLATE, AND SHOULD BE
// The usual enterprise terms promise uptime, support response times and
// indemnities. This service is one instance in one region run by one person,
// and promising any of that would be writing a cheque the operator cannot
// cash — which is worse than promising nothing, because a broken written
// commitment is actionable while an absent one is merely disappointing.
//
// So these say plainly what is offered and what is not, and match the status
// page rather than contradicting it.
//
// NOT LEGAL ADVICE
// Drafted in-house, not reviewed by a lawyer. Said at the top for the same
// reason as the privacy policy: a document that looks reviewed and is not
// misleads the reader it was meant to reassure.
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — HB-Eval',
  description: 'The terms on which HB-Eval is provided, and what is not promised.',
}

const UPDATED = '7 August 2026'

function Section({ id, title, children }: {
  id: string; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-xs text-slate-500 mb-6">Last updated {UPDATED}</p>

        <div className="card p-4 mb-8" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
          <p className="text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Drafted in-house and not reviewed by a lawyer. HB-Eval is an
              independent research project, not a company.
            </span>
          </p>
        </div>

        <Section id="agreement" title="The agreement">
          <p>By creating an account or using the service you accept these terms.
            If you do not, do not use it. The service is operated by Abuelgasim
            Mohamed Ibrahim Adam as an independent research project.</p>
        </Section>

        <Section id="service" title="What is provided">
          <p>Tools for measuring the operational reliability of AI agents:
            evaluation against a fault battery, live monitoring, policy-driven
            halting, alerting, and signed behavioural records.</p>
          <p>Plans: the free tier allows 500 evaluations a month and 3 agents.
            Pro allows 5,000 evaluations a month. Quotas are shared across your
            agents and reset monthly. Monitoring sessions do not consume
            evaluation quota.</p>
        </Section>

        <Section id="not-promised" title="What is not promised">
          <p>This section matters more than most, so it is stated directly
            rather than buried in a disclaimer.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-slate-100">No uptime guarantee.</strong>{' '}
              A single instance in one region, no redundancy, no automatic
              failover. Service is best-effort.</li>
            <li><strong className="text-slate-100">No support commitment.</strong>{' '}
              No response-time obligation, no on-call, no account management.</li>
            <li><strong className="text-slate-100">No compensation for
              downtime</strong>, and no service credits.</li>
            <li><strong className="text-slate-100">No certification.</strong>{' '}
              HB-Eval is not an accreditation body. An Agent Passport records
              observed behaviour and is signed; it is not a certificate, an
              audit, or a warranty about anything your agent will do next.</li>
            <li><strong className="text-slate-100">No guarantee of
              correctness.</strong> The metrics measure behavioural reliability
              under fault. They do not judge whether your agent&rsquo;s answers
              are true.</li>
          </ul>
          <p>
            The{' '}
            <Link href="/status" className="text-blue-400 hover:text-blue-300">
              status page
            </Link>{' '}
            states the same commitments and publishes what the service is
            actually doing.
          </p>
        </Section>

        <Section id="your-data" title="Your data stays yours">
          <p>You retain all rights to your agents, your tasks, your prompts and
            your results. We claim no ownership and no licence beyond what is
            needed to operate the service for you.</p>
          <p>We do not use your data to train models. If you opt in to the
            Observatory, anonymised aggregate figures — never content, never
            identifiers — contribute to public statistics.</p>
          <p>Export and deletion are self-service and immediate, in Settings.</p>
        </Section>

        <Section id="your-responsibilities" title="Your responsibilities">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Keep your API keys and agent secrets confidential. Rotate them
              from the agent page if exposed.</li>
            <li>Do not attempt to exceed your quota by creating multiple
              accounts, and do not attempt to disrupt the service for others.</li>
            <li>Do not use the service unlawfully, or to process data you have no
              right to process.</li>
            <li>You are responsible for what your agent does. Safe Halt raises a
              flag your code must act on; it stops the next step and cannot undo
              a previous one.</li>
          </ul>
        </Section>

        <Section id="passports" title="Agent Passports">
          <p>A passport is a signed record of behaviour observed by this
            service, valid for 90 days from issue. Publishing one is your
            choice, produces a public link, and can be withdrawn at any time.</p>
          <p>You may share and republish passports we issue to you. You may not
            alter one and present it as issued by us — the signature makes any
            alteration detectable, and doing so would be misrepresentation.</p>
          <p>Passports marked <code className="code-inline">demo: true</code>{' '}
            record a scripted demonstration on this site and describe no deployed
            agent.</p>
        </Section>

        <Section id="liability" title="Liability">
          <p>The service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;, without warranties of any kind, express or implied.</p>
          <p>To the fullest extent permitted by law, the operator is not liable
            for indirect, incidental or consequential damages, for lost profits,
            or for loss of data. Total liability for any claim is limited to what
            you paid in the twelve months before it arose — which, on the free
            plan, is nothing.</p>
          <p>Nothing here excludes liability that cannot lawfully be excluded.</p>
        </Section>

        <Section id="termination" title="Suspension and termination">
          <p>You may delete your account at any time, which removes your data as
            described in the{' '}
            <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">
              privacy policy
            </Link>.</p>
          <p>We may suspend an account that is disrupting the service or being
            used unlawfully. Where circumstances allow, notice will be given
            first and an export offered.</p>
          <p>As a research project, the service may be discontinued. If that
            happens, reasonable notice will be given so that data can be
            exported.</p>
        </Section>

        <Section id="changes" title="Changes">
          <p>These terms may change; the date above will reflect it. Continuing
            to use the service after a change means you accept it.</p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            <a href="mailto:abuelgasim.hbeval@outlook.com"
               className="text-blue-400 hover:text-blue-300">
              abuelgasim.hbeval@outlook.com
            </a>
          </p>
        </Section>

        <p className="text-xs text-slate-500 mt-10">
          See also the{' '}
          <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </Link>{' '}
          and the{' '}
          <Link href="/status" className="text-blue-400 hover:text-blue-300">
            service status page
          </Link>.
        </p>
      </div>
    </div>
  )
}
