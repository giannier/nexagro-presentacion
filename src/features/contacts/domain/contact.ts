/**
 * Networking contact: the domain model and its validation rules.
 *
 * Pure TypeScript with no framework or I/O dependency, so the exact same rules run in
 * the browser (instant feedback) and on the server (the only check that can be trusted).
 */

export const CONTACT_TEXT_FIELDS = [
  'fullName',
  'jobTitle',
  'companyName',
  'industry',
  'email',
  'phone',
  'website',
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'notes',
  'interestCompany',
] as const;

export type ContactTextField = (typeof CONTACT_TEXT_FIELDS)[number];

/**
 * Hidden form field humans never see. Bots that fill every input fill this one too,
 * which is how the server tells them apart without a CAPTCHA.
 */
export const CONTACT_HONEYPOT_FIELD = 'nickname';

export type ContactInput = Partial<Record<ContactTextField, unknown>> & {
  readonly consent?: unknown;
};

export type Contact = Readonly<Record<ContactTextField, string>> & {
  /** ISO timestamp of when the person authorised storing their data. */
  readonly consentAt: string;
};

export type ContactErrorField = ContactTextField | 'consent';
export type ContactErrors = Partial<Record<ContactErrorField, string>>;

export type ContactValidation =
  | { readonly ok: true; readonly contact: Contact }
  | { readonly ok: false; readonly errors: ContactErrors };

const MAX_LENGTH: Readonly<Record<ContactTextField, number>> = {
  fullName: 120,
  jobTitle: 120,
  companyName: 160,
  industry: 120,
  email: 160,
  phone: 30,
  website: 200,
  instagram: 200,
  facebook: 200,
  linkedin: 200,
  tiktok: 200,
  notes: 1000,
  interestCompany: 160,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

function readText(value: unknown, field: ContactTextField): string {
  if (typeof value !== 'string') return '';
  const text = field === 'notes' ? value.trim() : value.trim().replace(/\s+/g, ' ');
  return text.slice(0, MAX_LENGTH[field]);
}

/** Accepts `empresa.com` as well as a full URL, and stores the normalised form. */
function normaliseWebsite(value: string): string | null {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

export function validateContact(input: ContactInput, now: Date = new Date()): ContactValidation {
  const values = Object.fromEntries(
    CONTACT_TEXT_FIELDS.map((field) => [field, readText(input[field], field)]),
  ) as Record<ContactTextField, string>;

  const errors: ContactErrors = {};

  if (values.fullName.length < 2) errors.fullName = 'Ingresa el nombre de la persona.';
  if (values.companyName.length < 2) errors.companyName = 'Ingresa el nombre de la empresa.';
  if (values.industry.length < 2) errors.industry = 'Indica el área o rubro de la empresa.';

  if (values.email !== '' && !EMAIL_PATTERN.test(values.email)) {
    errors.email = 'El correo no es válido.';
  }

  if (values.phone !== '') {
    const digits = values.phone.replace(/\D/g, '').length;
    if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
      errors.phone = 'El teléfono no es válido.';
    }
  }

  // A contact nobody can reach is not a contact.
  if (values.email === '' && values.phone === '') {
    errors.email = 'Ingresa al menos un correo o un teléfono.';
  }

  if (values.website !== '') {
    const website = normaliseWebsite(values.website);
    if (website === null) errors.website = 'La página web no es válida.';
    else values.website = website;
  }

  if (input.consent !== true) {
    errors.consent = 'Se necesita la autorización para guardar los datos.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, contact: { ...values, consentAt: now.toISOString() } };
}
