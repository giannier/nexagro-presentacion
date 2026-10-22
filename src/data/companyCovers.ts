/**
 * Optional cover artwork per company, keyed by slug. NEXAGRO has none yet, so the
 * showcase panel falls back to a gradient in the brand colour. To add one, drop a file
 * into `public/portadas/` and register it here.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
