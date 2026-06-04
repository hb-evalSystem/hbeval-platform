import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HB-Eval OS — Reliability Operating System for Agentic AI',
  description:
    'The first reliability certification framework for agentic AI. ' +
    'Measure, certify, and monitor your AI agents with five battle-tested metrics.',
  metadataBase: new URL('https://hbeval.com'),
  openGraph: {
    title: 'HB-Eval OS',
    description: 'Reliability certification for agentic AI systems.',
    url: 'https://hbeval.com',
    siteName: 'HB-Eval OS',
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'HB-Eval OS' },
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
