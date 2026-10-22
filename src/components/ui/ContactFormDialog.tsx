'use client';

import { useCallback, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { CheckIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import type { Company } from '@/data/companies';
import {
  CONTACT_HONEYPOT_FIELD,
  validateContact,
  type ContactErrorField,
  type ContactErrors,
  type ContactTextField,
} from '@/features/contacts/domain/contact';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

type FormField = Exclude<ContactTextField, 'interestCompany'>;
type FormValues = Record<FormField, string>;

const EMPTY_VALUES: FormValues = {
  fullName: '',
  jobTitle: '',
  companyName: '',
  industry: '',
  email: '',
  phone: '',
  website: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  tiktok: '',
  notes: '',
};

/** Order used to move focus to the first invalid field. */
const FOCUS_ORDER: readonly ContactErrorField[] = [
  'fullName',
  'companyName',
  'industry',
  'email',
  'phone',
  'website',
  'consent',
];

const INDUSTRY_SUGGESTIONS = [
  'Agroexportación',
  'Agroindustria',
  'Comercio',
  'Construcción',
  'Consultoría',
  'Educación y capacitación',
  'Finanzas y seguros',
  'Inmobiliaria',
  'Legal',
  'Logística y transporte',
  'Manufactura',
  'Minería y energía',
  'Salud',
  'Seguridad y salud en el trabajo',
  'Servicios profesionales',
  'Tecnología',
  'Turismo y gastronomía',
];

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'success'; readonly fullName: string; readonly companyName: string }
  | { readonly kind: 'error'; readonly message: string };

type ApiResponse = { ok?: unknown; errors?: ContactErrors; message?: unknown };

type ContactFormDialogProps = {
  readonly company: Company;
  readonly open: boolean;
  readonly onClose: () => void;
};

/**
 * "Formulario": captures a networking contact and stores it through `/api/contacts.php`.
 *
 * Validation runs here with the same domain rules the server applies, so mistakes are
 * reported instantly; the server still re-validates everything. An unfinished draft is
 * kept when the dialog is closed by accident, and cleared once a contact is saved.
 */
export function ContactFormDialog({ company, open, onClose }: ContactFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const industryListId = useId();

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const resetForm = useCallback(() => {
    setValues(EMPTY_VALUES);
    setConsent(false);
    setErrors({});
    setStatus({ kind: 'idle' });
  }, []);

  const handleClose = useCallback(() => {
    if (status.kind === 'success') resetForm();
    onClose();
  }, [status.kind, resetForm, onClose]);

  const focusFirstError = (fieldErrors: ContactErrors) => {
    const field = FOCUS_ORDER.find((name) => fieldErrors[name] !== undefined);
    if (field === undefined) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  };

  const update = (field: FormField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (previous[field] === undefined && !(field === 'phone' && previous.email !== undefined)) {
        return previous;
      }
      const next = { ...previous };
      delete next[field];
      // "Email or phone" is reported on the email field; typing a phone resolves it.
      if (field === 'phone') delete next.email;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.kind === 'submitting') return;

    const honeypot = new FormData(event.currentTarget).get(CONTACT_HONEYPOT_FIELD);
    const payload = { ...values, interestCompany: company.name, consent };

    const validation = validateContact(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }

    setErrors({});
    setStatus({ kind: 'submitting' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, [CONTACT_HONEYPOT_FIELD]: honeypot ?? '' }),
      });
      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (response.ok && data.ok === true) {
        setStatus({
          kind: 'success',
          fullName: validation.contact.fullName,
          companyName: validation.contact.companyName,
        });
        return;
      }

      if (response.status === 422 && data.errors !== undefined) {
        setErrors(data.errors);
        setStatus({ kind: 'idle' });
        focusFirstError(data.errors);
        return;
      }

      setStatus({
        kind: 'error',
        message:
          typeof data.message === 'string' ? data.message : 'No se pudo guardar el contacto.',
      });
    } catch {
      setStatus({ kind: 'error', message: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar contacto"
      description="Guarda los datos de la persona en tu base de networking."
    >
      {status.kind === 'success' ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-semibold">Contacto guardado</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {status.fullName} de {status.companyName} ya forma parte de tu base de networking.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <button type="button" onClick={resetForm} className={primaryButtonClassName}>
              Registrar otro contacto
            </button>
            <button type="button" onClick={handleClose} className={secondaryButtonClassName}>
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
            Interesado en <strong className="font-semibold text-neutral-900">{company.name}</strong>
          </p>

          <FieldGroup legend="Persona">
            <TextField name="fullName" label="Nombre de la persona" required value={values.fullName} onChange={update('fullName')} error={errors.fullName} />
            <TextField name="jobTitle" label="Cargo" value={values.jobTitle} onChange={update('jobTitle')} error={errors.jobTitle} />
          </FieldGroup>

          <FieldGroup legend="Empresa">
            <TextField name="companyName" label="Nombre de la empresa" required value={values.companyName} onChange={update('companyName')} error={errors.companyName} />
            <TextField name="industry" label="Área o rubro" required list={industryListId} value={values.industry} onChange={update('industry')} error={errors.industry} />
            <datalist id={industryListId}>
              {INDUSTRY_SUGGESTIONS.map((industry) => (
                <option key={industry} value={industry} />
              ))}
            </datalist>
            <TextField name="website" label="Página web" type="url" inputMode="url" placeholder="empresa.com" value={values.website} onChange={update('website')} error={errors.website} className="sm:col-span-2" />
          </FieldGroup>

          <FieldGroup legend="Contacto" hint="Ingresa al menos un correo o un teléfono.">
            <TextField name="email" label="Correo de contacto" type="email" inputMode="email" value={values.email} onChange={update('email')} error={errors.email} />
            <TextField name="phone" label="Teléfono / WhatsApp" type="tel" inputMode="tel" placeholder="+51 999 999 999" value={values.phone} onChange={update('phone')} error={errors.phone} />
          </FieldGroup>

          <details className="group rounded-2xl border border-neutral-200 px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-neutral-800">
              Redes sociales <span className="font-normal text-neutral-400">(opcional)</span>
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField name="instagram" label="Instagram" placeholder="@usuario o enlace" value={values.instagram} onChange={update('instagram')} />
              <TextField name="facebook" label="Facebook" placeholder="Página o enlace" value={values.facebook} onChange={update('facebook')} />
              <TextField name="linkedin" label="LinkedIn" placeholder="Perfil o enlace" value={values.linkedin} onChange={update('linkedin')} />
              <TextField name="tiktok" label="TikTok" placeholder="@usuario o enlace" value={values.tiktok} onChange={update('tiktok')} />
            </div>
          </details>

          <div>
            <label htmlFor="contact-notes" className="mb-1.5 block text-sm font-medium text-neutral-800">
              Notas
            </label>
            <textarea
              id="contact-notes"
              name="notes"
              rows={3}
              value={values.notes}
              onChange={update('notes')}
              placeholder="Qué busca, en qué quedaron, próximos pasos…"
              className={inputClassName(false)}
            />
          </div>

          {/* Honeypot: invisible and unreachable for people, irresistible for bots. */}
          <div aria-hidden="true" className="sr-only">
            <label>
              No completar
              <input type="text" name={CONTACT_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm text-neutral-600">
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  setErrors((previous) => {
                    if (previous.consent === undefined) return previous;
                    const next = { ...previous };
                    delete next.consent;
                    return next;
                  });
                }}
                aria-invalid={errors.consent !== undefined ? true : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-neutral-900"
              />
              <span>
                La persona autoriza el uso de estos datos para contacto comercial y networking,
                conforme a la Ley N.° 29733 de Protección de Datos Personales.
              </span>
            </label>
            {errors.consent !== undefined && <p className="mt-1.5 text-xs text-red-600">{errors.consent}</p>}
          </div>

          {status.kind === 'error' && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {status.message}
            </p>
          )}

          <button type="submit" disabled={status.kind === 'submitting'} className={primaryButtonClassName}>
            {status.kind === 'submitting' ? 'Guardando…' : 'Guardar contacto'}
          </button>
        </form>
      )}
    </Modal>
  );
}

const primaryButtonClassName = [
  'w-full rounded-2xl bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white transition-colors',
  'hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
].join(' ');

const secondaryButtonClassName = [
  'w-full rounded-2xl border border-neutral-200 px-5 py-3.5 text-sm font-semibold text-neutral-900',
  'transition-colors hover:bg-neutral-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
].join(' ');

function inputClassName(hasError: boolean): string {
  return [
    // 16px text stops iOS Safari from zooming the page when a field gains focus.
    'w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-neutral-900 outline-none transition',
    'placeholder:text-neutral-400 focus:ring-4',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-neutral-200 focus:border-neutral-900 focus:ring-neutral-100',
  ].join(' ');
}

function FieldGroup({
  legend,
  hint,
  children,
}: {
  readonly legend: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{legend}</legend>
      {hint !== undefined && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

type TextFieldProps = {
  readonly name: FormField;
  readonly label: string;
  readonly value: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly type?: 'text' | 'email' | 'tel' | 'url';
  readonly inputMode?: 'text' | 'email' | 'tel' | 'url';
  readonly placeholder?: string;
  readonly list?: string;
  readonly className?: string;
};

function TextField({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  type = 'text',
  inputMode,
  placeholder,
  list,
  className,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        list={list}
        // Filled in on a shared device for other people: the owner's autofill would only get in the way.
        autoComplete="off"
        aria-required={required || undefined}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        className={inputClassName(error !== undefined)}
      />
      {error !== undefined && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
