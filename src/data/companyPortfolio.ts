/**
 * Portfolio items per company, keyed by slug (files under `public/portafolio/<slug>/`).
 * NEXAGRO has none yet, so the Portafolio and Catálogo buttons stay hidden.
 */

export type PortfolioItem = {
  readonly type: 'image' | 'pdf' | 'video';
  readonly src: string;
  readonly name: string;
};

export const COMPANY_PORTFOLIO: Readonly<Record<string, readonly PortfolioItem[]>> = {};

export function portfolioFor(slug: string): readonly PortfolioItem[] {
  return COMPANY_PORTFOLIO[slug] ?? [];
}
