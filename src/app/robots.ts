// src/app/robots.ts
// Next.js serves this at /robots.txt automatically.
import type { MetadataRoute } from 'next'

const SITE = 'https://hbeval.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated and flow-only routes. Excluding them is not about
      // secrecy — they are already protected — but about keeping the indexed
      // surface to pages that answer a search. A login page ranking for the
      // product name is a worse result than the page explaining the product.
      disallow: ['/dashboard/', '/oauth/', '/login', '/register', '/api/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
