import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HB-Eval — Reliability Evaluation Platform for Agentic AI',
  // Positioning note: this describes what HB-Eval measures and how, rather
  // than asserting priority over other tools. Observability platforms answer
  // "what happened?"; HB-Eval answers "how much does this degrade under
  // injected faults, and does it qualify to operate at a given tier?" The
  // claim we can defend — and that differentiates us — is the methodology:
  // systematic fault injection, five behavioural metrics, published and
  // reproducible. An unqualified "first platform" claim invites a rebuttal
  // we cannot win and undermines the scientific rigour that is the project's
  // actual competitive advantage.
  description:
    'Operational reliability measurement for agentic AI. Five behavioural ' +
    'metrics under systematic fault injection, with a published, ' +
    'reproducible methodology — measuring the gap between benchmark ' +
    'performance and reliability under failure.',
  keywords: [
    'agentic AI',
    'AI agent reliability',
    'operational reliability',
    'fault injection',
    'agent evaluation',
    'AI safety',
    'LangChain',
    'LangGraph',
    'CrewAI',
  ],
  authors: [{ name: 'Abuelgasim Mohamed Ibrahim Adam' }],
  metadataBase: new URL('https://hbeval.com'),
  openGraph: {
    title: 'HB-Eval — Reliability Evaluation for Agentic AI',
    description:
      'Measure how reliably your agent behaves under injected faults — ' +
      'five metrics, published methodology, open source.',
    url: 'https://hbeval.com',
    siteName: 'HB-Eval',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HB-Eval — Reliability Evaluation for Agentic AI',
    description:
      'Measure how reliably your agent behaves under injected faults — ' +
      'five metrics, published methodology, open source.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inter — the clean sans-serif used throughout */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
