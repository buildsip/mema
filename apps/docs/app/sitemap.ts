import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

/**
 * Publish /sitemap.xml.
 *
 * Home, plus every docs page. /docs itself redirects to the first page,
 * so that URL is left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...source.getPages().map((page): MetadataRoute.Sitemap[number] => ({
      url: new URL(page.url, siteUrl).href,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
  ];
}
