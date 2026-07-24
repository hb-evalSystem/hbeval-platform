// src/app/sitemap.ts
// Next.js serves this at /sitemap.xml automatically.
//
// Only public, indexable pages belong here. Dashboard routes are behind
// authentication and would return a redirect to a crawler — listing them
// wastes crawl budget and reports errors in Search Console.
import type { MetadataRoute } from 'next'

const SITE = 'https://hbeval.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE,                    lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/docs`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    // Observatory changes as contributions arrive, so it is crawled more often.
    { url: `${SITE}/observatory`,   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE}/pricing`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/legal/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE}/legal/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
