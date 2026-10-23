'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CheckIcon, MicIcon } from '@/components/ui/icons';
import { useSpeechRecognizer } from '@/hooks/useSpeechRecognizer';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

type Fields = { readonly fullName: string; readonly phone: string; readonly industry: string };
const EMPTY_FIELDS: Fields = { fullName: '', phone: '', industry: '' };

type Phase =
  | { readonly kind: 'listening'; readonly fields: Fields }
  | { readonly kind: 'checking'; readonly fields: Fields }
  | { readonly kind: 'saving'; readonly fields: Fields }
  | { readonly kind: 'success'; readonly fullName: string }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'timeout' };

const FIELD_LABELS: Readonly<Record<keyof Fields, string>> = {
  fullName: 'Nombre',
  phone: 'Teléfono',
  industry: 'Rubro',
};

/** Give up rather than listen silently forever if the three fields never come up. */
const MAX_CAPTURE_MS = 90_000;

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

/**
 * "Registrar cliente" by voice: listens to the live conversation, sends the accumulated
 * transcript to `/api/quick-register.php` after every finalised sentence, and the moment
 * name + phone + rubro are all captured, saves through `/api/quick-contact.php` and shows
 * "Cliente registrado" — no review step, by explicit choice for this reduced, three-field
 * flow (unlike the fuller "Formulario" voice recorder, which always waits for a tap).
 *
 * A background banner, not a modal: the point is this keeps working while whoever is
 * running it keeps looking at the client and the wheel, not at the tablet.
 */
export function QuickRegisterBanner({ interestCompany, onDone }: QuickRegisterBannerProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'listening', fields: EMPTY_FIELDS });
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const transcriptRef = useRef('');
  const checkingRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (checkingRef.current) return;
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
        checkingRef.current = false;
        setPhase((previous) =>
          previous.kind === 'checking' ? { kind: 'listening', fields: previous.fields } : previous,
        );
        return;
      }

      const fields: Fields = {
        fullName: data.fields.fullName ?? '',
        phone: data.fields.phone ?? '',
        industry: data.fields.industry ?? '',
      };
      const missing = data.missing ?? [];

      if (missing.length > 0) {
        checkingRef.current = false;
        setPhase({ kind: 'listening', fields });
        return;
      }

      setPhase({ kind: 'saving', fields });
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

      checkingRef.current = false;
      setPhase({
        kind: 'error',
        message: typeof saveData.message === 'string' ? saveData.message : 'No se pudo guardar el contacto.',
      });
    } catch {
      checkingRef.current = false;
      setPhase((previous) =>
        previous.kind === 'checking' || previous.kind === 'saving'
          ? { kind: 'listening', fields: previous.fields }
          : previous,
      );
    }
  }, [interestCompany]);

  const handleFinalText = useCallback(
    (text: string) => {
      transcriptRef.current = `${transcriptRef.current} ${text}`.trim();
      setTranscriptPreview(transcriptRef.current);
      void runCheck();
    },
    [runCheck],
  );

  const listening = phase.kind === 'listening' || phase.kind === 'checking';
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
    if (phase.kind !== 'listening' && phase.kind !== 'checking') return;
    const timer = setTimeout(() => setPhase({ kind: 'timeout' }), MAX_CAPTURE_MS);
    return () => clearTimeout(timer);
  }, [phase.kind]);

  const fields = phase.kind === 'listening' || phase.kind === 'checking' || phase.kind === 'saving' ? phase.fields : EMPTY_FIELDS;

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
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-white/70">
              {(Object.keys(FIELD_LABELS) as (keyof Fields)[]).map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${fields[key] !== '' ? 'bg-emerald-400' : 'bg-white/30'}`}
                  />
                  {FIELD_LABELS[key]}
                </li>
              ))}
            </ul>
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
