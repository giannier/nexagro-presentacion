/**
 * GENERATED FILE — do not edit by hand.
 * Run `npm run logos:optimize` to regenerate from the trimmed logos in public/logos.
 *
 * Width ÷ height of each logo's real artwork, after the optimizer trims away the
 * transparent padding the source PNGs ship with. A value above 1 is wider than tall.
 * Use this wherever a logo is placed into a fixed box, so it can be sized to fit
 * without stretching — the browser has no way to measure an image's shape from its
 * file path alone.
 */
export const LOGO_ASPECT_RATIOS: Readonly<Record<string, number>> = {
  nexagro: 3.2297,
};

/** Falls back to square when a company has no entry yet. */
export function logoAspectRatio(slug: string): number {
  return LOGO_ASPECT_RATIOS[slug] ?? 1;
}
