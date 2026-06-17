import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HB-Eval — Reliability Evaluation Platform for Agentic AI',
  description:
    'The first reliability evaluation platform for agentic AI. ' +
    'Measure and monitor your AI agents with five battle-tested metrics ' +
    'under fault-injection stress testing.',
  metadataBase: new URL('https://hbeval.com'),
  openGraph: {
    title: 'HB-Eval',
    description: 'Reliability evaluation for agentic AI systems.',
    url: 'https://hbeval.com',
    siteName: 'HB-Eval',
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'HB-Eval' },
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
