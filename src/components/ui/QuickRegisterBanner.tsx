'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CheckIcon, MicIcon } from '@/components/ui/icons';
import { useSpeechRecognizer } from '@/hooks/useSpeechRecognizer';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

type Fields = {
  readonly fullName: string;
  readonly phone: string;
  readonly companyName: string;
  readonly email: string;
  readonly industry: string;
};
const EMPTY_FIELDS: Fields = { fullName: '', phone: '', companyName: '', email: '', industry: '' };

type Phase =
  | { readonly kind: 'listening'; readonly fields: Fields }
  | { readonly kind: 'checking'; readonly fields: Fields }
  /** Name, phone, company and rubro are in; waiting a moment for an optional email. */
  | { readonly kind: 'grace'; readonly fields: Fields }
  | { readonly kind: 'saving'; readonly fields: Fields }
  | { readonly kind: 'success'; readonly fullName: string }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'timeout' };

/** Display order. Email is optional, so it is marked as such and never blocks the save. */
const FIELD_LABELS: Readonly<Record<keyof Fields, string>> = {
  fullName: 'Nombre',
  phone: 'Teléfono',
  companyName: 'Empresa',
  email: 'Correo (opcional)',
  industry: 'Rubro',
};

/** Give up rather than listen silently forever if the required fields never come up. */
const MAX_CAPTURE_MS = 90_000;

/**
 * Once the four required fields are captured, wait this long for an email before saving
 * anyway. Restarted by every new recognised utterance; saying "guardar" skips the wait.
 */
const EMAIL_GRACE_MS = 6_000;

const MIN_PHONE_DIGITS = 6;

type QuickRegisterResponse = {
  readonly ok?: boolean;
  readonly fields?: Partial<Fields>;
  readonly missing?: string[];
  readonly message?: string;
};

type QuickContactResponse = { readonly ok?: boolean; readonly message?: string };

type QuickRegisterBannerProps = {
  readonly interestCompany: string;
  readonly onDone: () => void;
};

/** Spoken "guardar" ends the capture right away with whatever has been heard so far. */
function isSaveKeyword(text: string): boolean {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/);
  return words.includes('guardar') || words.includes('guarda') || words.includes('guardalo');
}

/** Required to save at all (the server rejects anything less). Company may be empty. */
function canForceSave(fields: Fields): boolean {
  return (
    fields.fullName.length >= 2 &&
    fields.phone.replace(/\D/g, '').length >= MIN_PHONE_DIGITS &&
    fields.industry.length >= 2
  );
}

/** The banner's own completeness rule; it does not rely on the workflow's `complete` flag. */
function hasRequiredFields(fields: Fields): boolean {
  return canForceSave(fields) && fields.companyName.length >= 2;
}

/**
 * "Registrar cliente" by voice: listens to the live conversation, sends the accumulated
 * transcript to `/api/quick-register.php` after every finalised sentence, and once name,
 * phone, company and rubro are captured it saves through `/api/quick-contact.php` and
 * shows "Cliente registrado" — no review step, by explicit choice for this reduced flow
 * (unlike the fuller "Formulario" voice recorder, which always waits for a tap).
 *
 * The email is optional but easy to lose: when the four required fields are in, the save
 * waits `EMAIL_GRACE_MS` for an email (or the word "guardar") instead of firing instantly.
 *
 * A background banner, not a modal: the point is this keeps working while whoever is
 * running it keeps looking at the client and the wheel, not at the tablet.
 */
export function QuickRegisterBanner({ interestCompany, onDone }: QuickRegisterBannerProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'listening', fields: EMPTY_FIELDS });
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const transcriptRef = useRef('');
  const checkingRef = useRef(false);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const fieldsRef = useRef<Fields>(EMPTY_FIELDS);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGrace = useCallback(() => {
    if (graceTimerRef.current !== null) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearGrace, [clearGrace]);

  const save = useCallback(
    async (fields: Fields) => {
      if (savingRef.current) return;
      savingRef.current = true;
      clearGrace();
      setPhase({ kind: 'saving', fields });

      try {
        const saveResponse = await fetch(`${API_BASE_URL}/api/quick-contact.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, interestCompany }),
        });
        const saveData = (await saveResponse.json().catch(() => ({}))) as QuickContactResponse;

        if (saveResponse.ok && saveData.ok === true) {
          setPhase({ kind: 'success', fullName: fields.fullName });
          return;
        }
        savingRef.current = false;
        setPhase({
          kind: 'error',
          message: typeof saveData.message === 'string' ? saveData.message : 'No se pudo guardar el contacto.',
        });
      } catch {
        savingRef.current = false;
        setPhase({ kind: 'error', message: 'No se pudo guardar el contacto.' });
      }
    },
    [clearGrace, interestCompany],
  );

  const runCheck = useCallback(async () => {
    if (savingRef.current) return;
    if (checkingRef.current) {
      // An utterance arrived while a check was in flight: look again once it finishes.
      dirtyRef.current = true;
      return;
    }
    checkingRef.current = true;
    setPhase((previous) => (previous.kind === 'listening' ? { kind: 'checking', fields: previous.fields } : previous));

    try {
      const response = await fetch(`${API_BASE_URL}/api/quick-register.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptRef.current }),
      });
      const data = (await response.json().catch(() => ({}))) as QuickRegisterResponse;

      if (!response.ok || data.ok !== true || data.fields === undefined) {
        setPhase((previous) => (previous.kind === 'checking' ? { kind: 'listening', fields: previous.fields } : previous));
        return;
      }

      const fields: Fields = {
        fullName: data.fields.fullName ?? '',
        phone: data.fields.phone ?? '',
        companyName: data.fields.companyName ?? '',
        email: data.fields.email ?? '',
        industry: data.fields.industry ?? '',
      };
      fieldsRef.current = fields;

      if (!hasRequiredFields(fields)) {
        clearGrace();
        setPhase({ kind: 'listening', fields });
        return;
      }

      if (fields.email !== '') {
        void save(fields);
        return;
      }

      // Required fields complete, no email yet: give it a moment before saving without.
      setPhase({ kind: 'grace', fields });
      clearGrace();
      graceTimerRef.current = setTimeout(() => void save(fieldsRef.current), EMAIL_GRACE_MS);
    } catch {
      setPhase((previous) => (previous.kind === 'checking' ? { kind: 'listening', fields: previous.fields } : previous));
    } finally {
      checkingRef.current = false;
      if (dirtyRef.current && !savingRef.current) {
        dirtyRef.current = false;
        void runCheck();
      }
    }
  }, [clearGrace, save]);

  const handleFinalText = useCallback(
    (text: string) => {
      if (savingRef.current) return;

      if (isSaveKeyword(text) && canForceSave(fieldsRef.current)) {
        void save(fieldsRef.current);
        return;
      }

      transcriptRef.current = `${transcriptRef.current} ${text}`.trim();
      setTranscriptPreview(transcriptRef.current);
      // Every new utterance restarts the email grace window (when one is running). The
      // check below re-arms it as well, or saves at once if the email just arrived.
      if (graceTimerRef.current !== null) {
        clearGrace();
        graceTimerRef.current = setTimeout(() => void save(fieldsRef.current), EMAIL_GRACE_MS);
      }
      void runCheck();
    },
    [clearGrace, runCheck, save],
  );

  const listening = phase.kind === 'listening' || phase.kind === 'checking' || phase.kind === 'grace';
  // Surfaced in the UI below rather than discarded — the only way anyone can tell, from
  // a live device with no console attached, whether the microphone session behind this
  // banner is actually running or silently dead.
  const mic = useSpeechRecognizer(listening, handleFinalText);

  // Auto-close a few seconds after success, and give up gracefully rather than listen
  // silently forever if nothing ever completes.
  useEffect(() => {
    if (phase.kind === 'success') {
      const timer = setTimeout(onDone, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase.kind, onDone]);

  useEffect(() => {
    if (phase.kind !== 'listening' && phase.kind !== 'checking' && phase.kind !== 'grace') return;
    const timer = setTimeout(() => setPhase({ kind: 'timeout' }), MAX_CAPTURE_MS);
    return () => clearTimeout(timer);
  }, [phase.kind]);

  const fields =
    phase.kind === 'listening' || phase.kind === 'checking' || phase.kind === 'grace' || phase.kind === 'saving'
      ? phase.fields
      : EMPTY_FIELDS;

  return (
    <div className="pointer-events-auto absolute inset-x-3 top-3 z-30 flex justify-center sm:inset-x-6 sm:top-6">
      <div className="flex w-full max-w-sm flex-col gap-2.5 rounded-2xl bg-neutral-900/90 px-4 py-3 text-white shadow-xl backdrop-blur-sm">
        {phase.kind === 'success' ? (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <CheckIcon className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold">
              Cliente registrado{phase.fullName !== '' ? `: ${phase.fullName}` : ''}
            </p>
          </div>
        ) : phase.kind === 'error' ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-red-300">{phase.message}</p>
            <button type="button" onClick={onDone} className="shrink-0 text-xs font-semibold underline">
              Cerrar
            </button>
          </div>
        ) : phase.kind === 'timeout' ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/80">No se completó el registro. Intentá de nuevo.</p>
            <button type="button" onClick={onDone} className="shrink-0 text-xs font-semibold underline">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MicIcon className="h-4 w-4 animate-pulse text-red-400" />
                <p className="text-xs font-semibold">
                  {phase.kind === 'saving' ? 'Guardando…' : 'Escuchando la conversación…'}
                </p>
              </div>
              <button type="button" onClick={onDone} className="shrink-0 text-[0.65rem] font-medium text-white/60 underline">
                Cancelar
              </button>
            </div>
            <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[0.7rem] text-white/70">
              {(Object.keys(FIELD_LABELS) as (keyof Fields)[]).map((key) => (
                <li key={key} className={`flex items-center gap-1.5 ${key === 'email' ? 'text-white/45' : ''}`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${fields[key] !== '' ? 'bg-emerald-400' : 'bg-white/30'}`}
                  />
                  {FIELD_LABELS[key]}
                </li>
              ))}
            </ul>
            {phase.kind === 'grace' && (
              <p className="text-[0.7rem] font-medium text-emerald-300">Di el correo o &quot;guardar&quot;</p>
            )}
            {/* Temporary while the feature is still being verified on real devices —
                shows exactly what the microphone session is doing and what it has heard
                so far, instead of a silent "Escuchando…" that looks identical whether it
                is actually working or has quietly died. */}
            <p className="text-[0.65rem] text-white/40">
              mic:{' '}
              {!mic.supported
                ? 'no soportado'
                : mic.permissionDenied
                  ? 'permiso denegado'
                  : mic.listening
                    ? 'activo'
                    : 'reconectando…'}
            </p>
            {transcriptPreview !== '' && (
              <p className="line-clamp-2 text-[0.65rem] text-white/40">“{transcriptPreview}”</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
