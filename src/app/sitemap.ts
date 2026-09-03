import type { MetadataRoute } from 'next';
import { launch, publicEnv } from '@/lib/env';
import { CANONICAL_ITEMS } from '@/lib/taxonomy/canonical-items';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.appUrl;
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/places`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/deals`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/cheapest`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    ...CANONICAL_ITEMS.map((i) => ({
      url: `${base}/${launch.slug}/cheapest/${i.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
