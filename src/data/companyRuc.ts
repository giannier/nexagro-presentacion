/**
 * RUC (Registro Único de Contribuyentes) per company, keyed by slug.
 * NEXAGRO's RUC is not in the project, so none is shown rather than guessed.
 */
export const COMPANY_RUC: Readonly<Record<string, string>> = {};

export function rucFor(slug: string): string | undefined {
  return COMPANY_RUC[slug];
}
