/**
 * Canonical registry of the business units rendered on the 3D wheel.
 *
 * INVARIANT: `slug` must match the file name of the logo in `public/logos/<slug>.png`.
 * This site presents a single company, so the "wheel" has one fixed card and input is
 * disabled when `COMPANY_COUNT` is 1; adding entries here re-enables it.
 */
export type Company = {
  readonly slug: string;
  readonly name: string;
  /** Public website. Empty while unknown: the website button and links are then hidden. */
  readonly url: string;
};

export const COMPANIES: readonly Company[] = [{ slug: 'nexagro', name: 'NEXAGRO Export', url: 'https://nexagroexport.com/' }] as const;

/** Resolves the public texture path for a company slug. */
export function getLogoPath(slug: string): string {
  return `/logos/${slug}.png`;
}

/**
 * Stable, mutable copy of every texture URL.
 * `useTexture` / `useLoader` require a mutable array, and the identity must be stable
 * across renders so the suspense cache key never changes.
 */
export const LOGO_PATHS: string[] = COMPANIES.map((company) => getLogoPath(company.slug));

export const COMPANY_COUNT = COMPANIES.length;
