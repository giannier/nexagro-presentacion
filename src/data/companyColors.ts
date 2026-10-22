/**
 * Brand colour per company, keyed by slug. Derived from the NEXAGRO logo green and
 * darkened so white text stays legible on the filled sectors.
 */
export const COMPANY_COLORS: Readonly<Record<string, string>> = {
  nexagro: '#4d8052',
};

/** Fallback for a slug with no colour. */
export const DEFAULT_COMPANY_COLOR = '#64748b';

export function companyColor(slug: string): string {
  return COMPANY_COLORS[slug] ?? DEFAULT_COMPANY_COLOR;
}
