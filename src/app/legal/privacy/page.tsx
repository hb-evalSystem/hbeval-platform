// app/legal/privacy/page.tsx
// Privacy Policy. Explains what we collect, why, how secrets are protected, the
// data-donation option, and user rights (access, export, deletion).
// Have a lawyer review for your jurisdiction before commercial launch.
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — HB-Eval OS' }

const UPDATED = 'June 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-12"
         style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37,99,235,0.10), transparent)' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-8">
          <ArrowLeft size={14} /> Home
        </Link>

        <div className="flex items-center gap-2 mb-2 text-white font-semibold text-xl">
          <Shield size={22} className="text-blue-500" /> Privacy Policy
        </div>
        <p className="text-slate-500 text-sm mb-10">Last updated: {UPDATED}</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold mb-2">1. What we collect</h2>
            <p>We collect the account information you provide (name, email), the agent metadata
            you create (names, descriptions, agent IDs), and the evaluation data your agents
            submit (trajectories and computed metrics). We also store operational data such as
            usage counts.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. How we protect your secrets</h2>
            <p>Your per-agent AES key and signing secret are encrypted at rest using a master key
            that is never stored in our database. They are shown to you once at creation and are
            never displayed again. Our staff cannot read your plaintext secrets from the database.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. How we use data</h2>
            <p>We use your data to operate the Service: to authenticate you, run evaluations,
            enforce usage limits, and show your results. We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Data donation (optional)</h2>
            <p>If you delete your account, you may choose to donate your evaluation records to
            help improve the Service. Donated records are <strong className="text-white">de-identified</strong>:
            stripped of your identity and any link to your account or agents, retaining only the
            scientific fields (metrics and verdicts). If you instead choose full deletion, all
            your data is permanently removed.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Your rights</h2>
            <p>You can access and export your data at any time from Settings, and you can delete
            your account at any time. Depending on your region, you may have additional rights;
            contact us to exercise them.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Third parties</h2>
            <p>We use infrastructure providers (for hosting, database, and compute) that process
            data on our behalf under their own security commitments. We share data with them only
            as needed to run the Service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Retention</h2>
            <p>We keep your data while your account is active. On deletion, data is removed (or
            de-identified, if you donate it) as described above.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Contact</h2>
            <p>Privacy questions: <span className="text-white">abuelgasim.hbeval@outlook.com</span>.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-xs text-slate-600" style={{ borderColor: 'var(--border)' }}>
          <Link href="/legal/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
          {' · '}
          <Link href="/" className="hover:text-slate-400">Home</Link>
        </div>
      </div>
    </div>
  )
}
