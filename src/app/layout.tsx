// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

const SITE = 'https://hbeval.com'

import SiteHeader from '@/components/layout/SiteHeader'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),

  // Title: primary keyword first, under 60 characters. Search results truncate
  // past that, and a title whose distinguishing words fall off the end is the
  // same as not having them.
  title: {
    default: 'HB-Eval — Agent Reliability Testing & Live Monitoring',
    template: '%s · HB-Eval',
  },

  // 150–160 characters, opening with what the reader gets. This is the text
  // that decides whether someone clicks, so it is written as a claim rather
  // than a summary of the page's contents.
  description:
    'Measure how reliably your AI agent behaves under injected faults. Five behavioural metrics, live runtime monitoring, and automatic halt when reliability collapses.',

  keywords: [
    'AI agent reliability',
    'agent evaluation',
    'fault injection testing',
    'LLM agent monitoring',
    'agentic AI',
    'operational reliability',
    'AI safety',
    'LangChain evaluation',
    'LangGraph monitoring',
    'CrewAI testing',
    'MCP server',
  ],

  authors: [{ name: 'Abuelgasim Mohamed Ibrahim Adam' }],
  creator: 'HB-Eval',
  publisher: 'HB-Eval',

  // Tells search engines this is the authoritative URL, so query strings and
  // any www/non-www variants do not compete with each other for the same page.
  alternates: { canonical: SITE },

  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'HB-Eval',
    title: 'HB-Eval — Agent Reliability Testing & Live Monitoring',
    description:
      'Benchmarks measure what an agent can do. HB-Eval measures how much of that survives when tools fail, context degrades, and inputs turn adversarial.',
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'HB-Eval — Agent Reliability Testing & Live Monitoring',
    description:
      'Five behavioural metrics under systematic fault injection. Live monitoring, Safe Halt, and a published, reproducible methodology.',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },

  category: 'technology',
}

// JSON-LD. Search engines read this to classify the site rather than inferring
// from prose — which is what stops a result being described by whatever old
// text happened to be cached. It also makes the offer explicit: free tier,
// no card, so the snippet answers "can I try it?" before the click.
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'HB-Eval',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  description:
    'Operational reliability measurement for agentic AI. Five behavioural metrics under systematic fault injection, live runtime monitoring, and automatic halt on reliability collapse.',
  url: SITE,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier: 500 evaluations per month, no card required.',
  },
  author: {
    '@type': 'Person',
    name: 'Abuelgasim Mohamed Ibrahim Adam',
    url: 'https://orcid.org/0009-0000-7013-1493',
  },
  softwareHelp: `${SITE}/docs`,
  featureList: [
    'Fault-injection evaluation battery',
    'Five behavioural reliability metrics (PEI, FRR, IRS, TI, CSI)',
    'Live runtime monitoring',
    'Safe Halt on sustained reliability collapse',
    'LangChain, LangGraph and CrewAI adapters',
    'Remote MCP server',
    'Public reliability Observatory',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
