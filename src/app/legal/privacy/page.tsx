// src/app/legal/privacy/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Privacy policy.
//
// WRITTEN FROM THE SYSTEM, NOT FROM A TEMPLATE
// Every retention period, sub-processor and data category below was checked
// against the code rather than copied from a policy generator. Ninety days is
// the actual figure in the retention job; Supabase, Railway and Vercel are the
// actual processors; the Observatory really does strip identifiers at write
// time.
//
// A policy that describes a system nobody built is worse than a short one: it
// is a promise the operator cannot keep and cannot even check.
//
// NOT LEGAL ADVICE
// This was drafted in-house and has not been reviewed by a lawyer. That is
// stated at the top rather than hidden, because a document that looks
// professionally reviewed and is not misleads exactly the enterprise reader it
// was written to reassure.
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — HB-Eval',
  description: 'What HB-Eval collects, why, how long it is kept, and your rights over it.',
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6">
          <ArrowLeft size={14} /> hbeval.com
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-slate-500 mb-6">Last updated {UPDATED}</p>

        <div className="card p-4 mb-8" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
          <p className="text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              HB-Eval is an independent research project. This policy was drafted
              in-house and has not been reviewed by a lawyer. It describes what
              the system actually does; where it is silent, assume nothing is
              promised.
            </span>
          </p>
        </div>

        <Section id="who" title="Who we are">
          <p>
            HB-Eval is operated by Abuelgasim Mohamed Ibrahim Adam, an
            independent researcher. It is not a company, and there is no
            corporate entity behind it. Enquiries and data requests go to{' '}
            <a href="mailto:abuelgasim.hbeval@outlook.com"
               className="text-blue-400 hover:text-blue-300">
              abuelgasim.hbeval@outlook.com
            </a>.
          </p>
        </Section>

        <Section id="collect" title="What we collect">
          <p><strong className="text-slate-100">Account data.</strong> Your
            email address, and a password hash if you use email sign-in. We
            never see your password.</p>

          <p><strong className="text-slate-100">Agent metadata.</strong> Names
            and identifiers you give your agents, and encrypted credentials for
            them. Agent secrets are encrypted before storage, and the API key is
            stored only as a hash.</p>

          <p><strong className="text-slate-100">Evaluation and monitoring
            data.</strong> The reliability metrics your agent produces, step
            counts, threshold breaches, halt decisions and the policies that
            caused them, plus the measured overhead of monitoring itself.</p>

          <p><strong className="text-slate-100">What we do NOT collect.</strong>{' '}
            The content of your agent&rsquo;s prompts and responses does not
            reach us on the monitoring path. The SDK computes metrics locally
            and sends numbers. On the evaluation path, the task you submit is
            encrypted in transit with a key we hold for that transaction and is
            not retained after scoring.</p>

          <p><strong className="text-slate-100">Technical data.</strong>{' '}
            IP addresses appear in our hosting providers&rsquo; logs for
            security and rate limiting. We do not use advertising or analytics
            trackers, and there are no third-party cookies.</p>
        </Section>

        <Section id="why" title="Why we process it">
          <p>To operate the service you asked for — evaluating and monitoring
            agents you registered — and to enforce quotas and prevent abuse.
            That is contractual necessity and legitimate interest respectively,
            under GDPR Article 6(1)(b) and 6(1)(f).</p>
          <p>Contributing anonymised results to the Observatory happens only on
            your explicit consent, under Article 6(1)(a), and can be withdrawn
            at any time in Settings.</p>
        </Section>

        <Section id="processors" title="Who else processes it">
          <p>Three providers, each named because &ldquo;selected third
            parties&rdquo; tells you nothing you can act on:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-slate-100">Supabase</strong> — database
              and authentication.</li>
            <li><strong className="text-slate-100">Railway</strong> — the
              evaluation Gateway.</li>
            <li><strong className="text-slate-100">Vercel</strong> — the web
              application.</li>
          </ul>
          <p>Data may be processed outside your country, including in the United
            States, under those providers&rsquo; own transfer mechanisms. We do
            not sell data, and we do not share it with anyone else.</p>
        </Section>

        <Section id="retention" title="How long we keep it">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Account and agent records — until you delete them.</li>
            <li>Evaluation results and monitoring sessions — until you delete
              them or your account.</li>
            <li>Step-by-step snapshots — <strong className="text-slate-100">90
              days</strong>, then removed automatically.</li>
            <li>Alert delivery records — <strong className="text-slate-100">90
              days</strong>.</li>
            <li>Published passports — until withdrawn, then a year after they
              expire, so a cited link stays resolvable for a reasonable period.</li>
            <li>OAuth tokens — removed on expiry.</li>
          </ul>
          <p>
            The automatic cleanup runs daily, and the last successful run is
            published on our{' '}
            <Link href="/status" className="text-blue-400 hover:text-blue-300">
              status page
            </Link>{' '}
            — so this section can be checked rather than taken on trust.
          </p>
        </Section>

        <Section id="rights" title="Your rights">
          <p>Under GDPR and comparable laws you may access, correct, export,
            delete, restrict or object to processing of your data, and lodge a
            complaint with a supervisory authority.</p>
          <p>Two of these are self-service and immediate, in Settings:{' '}
            <strong className="text-slate-100">Export</strong> gives you
            everything held about your account as JSON, and{' '}
            <strong className="text-slate-100">Delete</strong> removes the
            account and everything linked to it.</p>
          <p>If you had consented to the Observatory, anonymised copies are
            taken <em>before</em> deletion proceeds, and the deletion is
            cancelled if that copy fails. Those copies carry no identifier and
            cannot be traced back to you — which also means they cannot be
            retrieved or removed on request afterwards. That is the trade
            anonymisation makes, and it is why the consent is explicit.</p>
        </Section>

        <Section id="observatory" title="The Observatory">
          <p>Off by default. If you turn it on, aggregate reliability figures
            from your runs contribute to public statistics.</p>
          <p>Contributions carry no user identifier, no agent identifier and no
            task content. Aggregates are withheld entirely until at least five
            independent accounts have contributed, so no figure can be traced to
            a single participant.</p>
        </Section>

        <Section id="security" title="Security">
          <p>Agent secrets are encrypted at rest. Requests are authenticated,
            signed, and protected against replay. Row-level security constrains
            what any account can read.</p>
          <p>No system is perfectly secure, and we make no guarantee that ours
            is. If you find a vulnerability, please write to the address above
            rather than disclosing it publicly.</p>
        </Section>

        <Section id="children" title="Children">
          <p>The service is not intended for anyone under 16, and we do not
            knowingly collect their data.</p>
        </Section>

        <Section id="changes" title="Changes">
          <p>Material changes will be reflected in the date at the top of this
            page. Continuing to use the service after a change means you accept
            it; if you do not, you can export and delete your data at any time.</p>
        </Section>

        <p className="text-xs text-slate-500 mt-10">
          See also the{' '}
          <Link href="/legal/terms" className="text-blue-400 hover:text-blue-300">
            Terms of Service
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
