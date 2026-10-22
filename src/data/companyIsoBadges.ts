/**
 * ISO certification badges per company, keyed by slug (`public/isos/<slug>.png`).
 * NEXAGRO has none, so no badge is rendered.
 */
export const COMPANY_ISO_BADGES: Readonly<Record<string, string>> = {};

export function isoBadgeFor(slug: string): string | undefined {
  return COMPANY_ISO_BADGES[slug];
}
