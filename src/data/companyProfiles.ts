/**
 * Showcase content for the left panel, keyed by company slug.
 *
 * The headline is split into three parts so the middle one can be painted in the
 * company's brand colour without any HTML inside a string:
 *
 *   lead       "Conectamos"
 *   highlight  "TALENTO Y RECURSOS,"        <- brand colour
 *   tail       "IMPULSAMOS EL DESARROLLO DE NUESTRO PAÍS"
 *
 * Copy, phones and emails must come from the company itself; never invent them.
 */

export type ShowcaseMedia = {
  readonly type: 'image' | 'video';
  readonly src: string;
  /**
   * Alternate crop for landscape layouts, where the showcase panel is a tall column and
   * `object-cover` would discard most of a wide source. Served via `<source media>`.
   */
  readonly landscapeSrc?: string;
  /** CSS `object-position` focal point, e.g. `30% 30%`. Defaults to the centre. */
  readonly focus?: string;
  /** Poster frame for a video, shown while it loads. */
  readonly poster?: string;
};

export type CompanyProfile = {
  readonly lead: string;
  readonly highlight: string;
  readonly tail: string;
  readonly subtitle: string;
  readonly phone: string;
  readonly email: string;
  /**
   * Optional override. Normally artwork is picked up automatically from
   * `public/portadas/<slug>.<ext>`; set this only to point somewhere else.
   */
  readonly media?: ShowcaseMedia;
};

export const COMPANY_PROFILES: Readonly<Record<string, CompanyProfile>> = {
  // NEXAGRO: headline and contact data come from the client's own material.
  nexagro: {
    lead: 'Productos agrícolas',
    highlight: 'de alta calidad,',
    tail: 'del campo peruano al mundo.',
    subtitle: '',
    phone: '+51 989 797 977',
    email: 'info@nexagroexport.com',
  },
};

const FALLBACK_PROFILE: CompanyProfile = {
  lead: '',
  highlight: '',
  tail: '',
  subtitle: '',
  phone: '',
  email: '',
};

export function profileFor(slug: string): CompanyProfile {
  return COMPANY_PROFILES[slug] ?? FALLBACK_PROFILE;
}
