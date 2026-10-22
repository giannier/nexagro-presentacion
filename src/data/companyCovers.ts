/**
 * Optional cover artwork per company, keyed by slug. If a company has none (or the file
 * fails to load), the showcase panel falls back to a gradient in the brand colour. To add one, drop a file
 * into `public/portadas/` and register it here.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
  nexagro: {
    type: 'image',
    // Portrait layouts (wide, short panel, ~1.3:1): the original's full 941px height and the
    // leftmost 1280px, so nothing is cropped vertically (hat and shoulders stay in frame).
    src: '/portadas/nexagro-panel-ancho.webp',
    // Landscape layouts: tall 46% x 100% column (~0.82:1). Full height again, 800px wide
    // (slightly wider than the panel so object-cover only trims the sides), centred on her.
    landscapeSrc: '/portadas/nexagro-panel-alto.webp',
    focus: '50% 50%',
  },
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
