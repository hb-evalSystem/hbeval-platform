// app/legal/terms/page.tsx
// Terms of Service. Plain, readable, balanced — protects the platform while
// being fair to users. Linked from registration (consent) and the footer.
// NOTE: This is a solid starting template. Before commercial launch, have a
// lawyer review it for your jurisdiction (especially the Pro/payment clauses).
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Terms of Service — HB-Eval' }

const UPDATED = 'June 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-12"
         style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37,99,235,0.10), transparent)' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-8">
          <ArrowLeft size={14} /> Home
        </Link>

        <div className="flex items-center gap-2 mb-2 text-white font-semibold text-xl">
          <Shield size={22} className="text-blue-500" /> Terms of Service
        </div>
        <p className="text-slate-500 text-sm mb-10">Last updated: {UPDATED}</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold mb-2">1. Acceptance</h2>
            <p>By creating an account or using HB-Eval (the "Service"), you agree to these
            Terms. If you are using the Service for an organisation, you accept these Terms on
            its behalf. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. The Service</h2>
            <p>HB-Eval evaluates the operational reliability of AI agents by subjecting
            them to a fault-injection battery and computing five reliability metrics
            (PEI, FRR, IRS, TI, CSI). Based on these metrics it reports diagnostic
            results and, where the thresholds are met, an internal reliability-tier
            qualification (for example, "Meets Tier 1"). This is a performance
            classification produced by HB-Eval; it is not an accredited safety
            certification and is not issued by any external certification body.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. Accounts and credentials</h2>
            <p>You are responsible for safeguarding your API key, AES key, and signing secret.
            These secrets are shown once and cannot be retrieved later; you may rotate them at
            any time. You are responsible for activity that occurs using your credentials.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Acceptable use</h2>
            <p>You agree not to misuse the Service: no attempts to break, overload, reverse-
            engineer, or gain unauthorised access to the platform or other users' data; no
            unlawful content; no circumvention of usage limits. We may suspend accounts that
            violate these rules.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Usage limits</h2>
            <p>Free accounts include a monthly evaluation allowance, distributed so that no
            single day can consume the entire monthly quota. We may adjust limits to protect
            the platform's stability. Paid plans, when available, will carry their own limits.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Your data</h2>
            <p>You own the data you submit. You may export it or delete your account at any time.
            When deleting, you may choose to permanently erase all data, or to donate your
            evaluation records in de-identified form to help improve the Service. We describe how
            we handle data in our <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Availability and changes</h2>
            <p>We aim for high availability but do not guarantee uninterrupted service. We may
            modify or discontinue features, and will give reasonable notice of material changes
            to these Terms. Continued use after changes means you accept them.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Liability</h2>
            <p>To the extent permitted by law, the Service is provided "as is", and we are not
            liable for indirect or consequential damages arising from its use. Nothing in these
            Terms excludes liability that cannot lawfully be excluded.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">9. Contact</h2>
            <p>Questions about these Terms: <span className="text-white">abuelgasim.hbeval@outlook.com</span>.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-xs text-slate-600" style={{ borderColor: 'var(--border)' }}>
          <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
          {' · '}
          <Link href="/" className="hover:text-slate-400">Home</Link>
        </div>
      </div>
    </div>
  )
}
