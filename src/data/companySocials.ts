/**
 * Official social profiles per company, keyed by company slug. Only add profiles that
 * are verified as official; an empty object hides every social button.
 */

export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'whatsapp';

export type CompanySocials = Partial<Record<SocialNetwork, string>>;

export type SocialLink = {
  readonly network: SocialNetwork;
  readonly url: string;
};

/** Display order on the QR page: the networks people most often follow come first. */
export const SOCIAL_NETWORK_ORDER: readonly SocialNetwork[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
  'whatsapp',
];

export const COMPANY_SOCIALS: Readonly<Record<string, CompanySocials>> = {
  // NEXAGRO: no official profiles on file yet. Add them here; the QR page picks them up.
  nexagro: {},
};

/** The company's profiles as an ordered list, skipping networks it does not use. */
export function socialLinksFor(slug: string): SocialLink[] {
  const socials = COMPANY_SOCIALS[slug] ?? {};
  return SOCIAL_NETWORK_ORDER.flatMap((network) => {
    const url = socials[network];
    return url === undefined ? [] : [{ network, url }];
  });
}
