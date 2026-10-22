/**
 * RUC (Registro Único de Contribuyentes) per company, keyed by slug.
 * Provided by the client.
 */
export const COMPANY_RUC: Readonly<Record<string, string>> = {
  nexagro: '20608593790',
};

/** Registered (SUNAT) legal name per company, keyed by slug. */
export const COMPANY_LEGAL_NAMES: Readonly<Record<string, string>> = {
  nexagro: 'NEXAGRO EXPORT SOCIEDAD ANONIMA CERRADA',
};

export function legalNameFor(slug: string): string | undefined {
  return COMPANY_LEGAL_NAMES[slug];
}

export function rucFor(slug: string): string | undefined {
  return COMPANY_RUC[slug];
}
