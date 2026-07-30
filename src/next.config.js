/** @type {import('next').NextConfig} */
// ─────────────────────────────────────────────────────────────────────────────
// Security headers. This file was previously empty ({}), which meant the site
// shipped with no Content-Security-Policy, no HSTS, and no framing protection —
// a gap first recorded in the April 2026 audit and still open until now.
//
// GATEWAY ORIGIN
// connect-src must name the Gateway explicitly. If NEXT_PUBLIC_GATEWAY_URL is
// set on Vercel it is used; otherwise the production Railway origin is the
// fallback. Getting this wrong does not fail the build — it fails at runtime,
// silently blocking the Observatory and monitoring fetches. Verify in the
// browser console after deploying: a CSP violation appears there, not in logs.
const GATEWAY_ORIGIN =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

const CSP = [
  "default-src 'self'",

  // 'unsafe-inline' is required here: Next.js injects inline bootstrap scripts
  // for hydration, and 'unsafe-eval' is needed by its development runtime.
  // Removing them needs nonce-based CSP via middleware, which is worth doing
  // later — but an imperfect policy today is far better than none, and this
  // still blocks the common case of injected external script sources.
  process.env.NODE_ENV === 'production'
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

  // Google Fonts is loaded from the document head in app/layout.tsx.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",

  "img-src 'self' data: blob: https:",

  // Supabase (auth, database, realtime websockets) and the Gateway.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${GATEWAY_ORIGIN}`,

  // Nothing embeds this app, and it embeds nothing.
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",

  "base-uri 'self'",
  // Blocks a compromised page from exfiltrating via form action to an
  // attacker-controlled endpoint.
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },

          // Two years, subdomains included, preload-eligible. Only meaningful
          // over HTTPS, which Vercel enforces anyway.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },

          // Redundant with frame-ancestors above, kept for older browsers that
          // honour the header but not the CSP directive.
          { key: 'X-Frame-Options', value: 'DENY' },

          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // No feature of this app needs these.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },

          // Isolates the browsing context from cross-origin popups.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
