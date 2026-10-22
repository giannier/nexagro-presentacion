/**
 * Optional cover artwork per company, keyed by slug. If a company has none (or the file
 * fails to load), the showcase panel falls back to a gradient in the brand colour. To add one, drop a file
 * into `public/portadas/` and register it here.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
  nexagro: {
    type: 'image',
    // Default (portrait layouts: wide, short panel): 800x680 crop of the photo around the woman.
    src: '/portadas/nexagro-panel-ancho.webp',
    // Landscape layouts give the panel a tall, narrow column (46% x 100%): a 600x941 crop
    // centred on her is served there instead of letting object-cover slice the 16:9 original.
    landscapeSrc: '/portadas/nexagro-panel-alto.webp',
    // Keep the head in frame when object-cover trims the top or bottom of either crop.
    focus: '55% 5%',
  },
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
