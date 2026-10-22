/**
 * Optional cover artwork per company, keyed by slug. If a company has none (or the file
 * fails to load), the showcase panel falls back to a gradient in the brand colour. To add one, drop a file
 * into `public/portadas/` and register it here.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
  nexagro: { type: 'image', src: '/portadas/nexagro.webp' },
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
