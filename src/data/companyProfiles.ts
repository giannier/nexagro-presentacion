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
  // NEXAGRO: no headline, phone or email on file; the panel shows the logo and name only.
  nexagro: { lead: '', highlight: '', tail: '', subtitle: '', phone: '', email: '' },
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
