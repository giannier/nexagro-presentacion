'use client';

import { useCallback, useRef, useState } from 'react';

import { MicIcon, StopIcon } from '@/components/ui/icons';
import type { VoiceContactResult } from '@/features/contacts/domain/voiceContactResult';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

type RecorderState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'recording' }
  | { readonly kind: 'processing' }
  | { readonly kind: 'error'; readonly message: string };

type VoiceRecorderProps = {
  readonly onResult: (result: VoiceContactResult) => void;
};

type UploadResponse = {
  readonly ok?: boolean;
  readonly transcript?: string;
  readonly fields?: Record<string, string>;
  readonly missing?: string[];
  readonly message?: string;
};

/** Spoken, not the raw field identifier — this is read aloud, not shown as a label. */
export const MISSING_LABELS: Readonly<Record<string, string>> = {
  fullName: 'el nombre de la persona',
  companyName: 'el nombre de la empresa',
  industry: 'el rubro de la empresa',
  contact: 'un correo o un teléfono',
};

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-PE';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/** Chrome/Android give opus in webm; Safari/iOS only ever offers mp4 — try in that order. */
function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

/**
 * "Registrar por voz": records a short self-introduction, sends it to `/api/voice-contact.php`
 * — which forwards it to the n8n workflow doing the real transcription and field
 * extraction — and hands the structured result up so the surrounding form can pre-fill
 * itself. Recording is manual start/stop rather than voice-activity detection: simpler,
 * and reliable in a noisy trade-fair hall where auto-detecting silence would misfire.
 */
export function VoiceRecorder({ onResult }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>({ kind: 'idle' });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const uploadRecording = useCallback(
    async (blob: Blob) => {
      setState({ kind: 'processing' });
      try {
        const response = await fetch(`${API_BASE_URL}/api/voice-contact.php`, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'audio/webm' },
          body: blob,
        });
        const data = (await response.json().catch(() => ({}))) as UploadResponse;

        if (!response.ok || data.ok !== true || data.fields === undefined) {
          setState({
            kind: 'error',
            message: typeof data.message === 'string' ? data.message : 'No se pudo procesar el audio.',
          });
          return;
        }

        const missing = data.missing ?? [];
        onResult({
          transcript: data.transcript ?? '',
          fields: data.fields as VoiceContactResult['fields'],
          missing,
        });

        speak(
          missing.length > 0
            ? `Todavía falta ${missing.map((field) => MISSING_LABELS[field] ?? field).join(', ')}. Volvé a grabar para completarlo.`
            : 'Listo, revisá los datos y guardá el contacto.',
        );

        setState({ kind: 'idle' });
      } catch {
        setState({ kind: 'error', message: 'Sin conexión. Inténtalo de nuevo.' });
      }
    },
    [onResult],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        releaseMicrophone();
        void uploadRecording(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState({ kind: 'recording' });
    } catch {
      setState({ kind: 'error', message: 'No se pudo acceder al micrófono.' });
    }
  }, [releaseMicrophone, uploadRecording]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const isRecording = state.kind === 'recording';

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-center">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={state.kind === 'processing'}
        aria-label={isRecording ? 'Detener grabación' : 'Grabar contacto por voz'}
        className={[
          'flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900',
          isRecording
            ? 'animate-pulse bg-red-600 hover:bg-red-700'
            : 'bg-neutral-900 hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60',
        ].join(' ')}
      >
        {isRecording ? <StopIcon className="h-6 w-6" /> : <MicIcon className="h-6 w-6" />}
      </button>

      <p className="text-xs font-medium text-neutral-600">
        {isRecording
          ? 'Escuchando… toca para detener'
          : state.kind === 'processing'
            ? 'Procesando el audio…'
            : 'Toca el micrófono y presentá a la persona'}
      </p>

      {state.kind === 'error' && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
