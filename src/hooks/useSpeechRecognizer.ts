'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The Web Speech API's `SpeechRecognition` has never made it into TypeScript's DOM
 * lib — Chrome still only ships the vendor-prefixed `webkitSpeechRecognition` — so the
 * shape used here is declared locally, covering only what this hook actually touches.
 */
interface SpeechRecognitionResultLike {
  readonly [index: number]: { readonly transcript: string };
  readonly isFinal: boolean;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const withVendorPrefixes = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return withVendorPrefixes.SpeechRecognition ?? withVendorPrefixes.webkitSpeechRecognition ?? null;
}

/** How long to wait before restarting after the browser ends a session on its own —
 *  Chrome does this periodically even mid-silence on a continuous recognizer. */
const RESTART_DELAY_MS = 300;

export type SpeechRecognizerState = {
  /** False on a browser without SpeechRecognition (Safari/iOS) — callers should hide
   *  any "listening" UI entirely rather than show a control that will never fire. */
  readonly supported: boolean;
  readonly listening: boolean;
  readonly permissionDenied: boolean;
};

/**
 * Thin, purpose-agnostic wrapper over continuous `SpeechRecognition`: while `enabled`,
 * keeps a session running (auto-restarting when the browser ends one on its own) and
 * calls `onFinalText` with the transcript of every finalised phrase. What a phrase means
 * — a short command, or one more sentence of an ongoing conversation to accumulate — is
 * entirely up to the caller; this hook only owns the microphone session itself.
 *
 * `enabled` toggling to `false` fully stops the recognizer rather than leaving it running
 * unused — two independent features (voice navigation, quick voice registration) both
 * build on this, and only one of them should ever hold the microphone at a time.
 */
export function useSpeechRecognizer(enabled: boolean, onFinalText: (text: string) => void): SpeechRecognizerState {
  const [state, setState] = useState<SpeechRecognizerState>({
    supported: getSpeechRecognitionConstructor() !== null,
    listening: false,
    permissionDenied: false,
  });

  const enabledRef = useRef(enabled);
  const onFinalTextRef = useRef(onFinalText);
  enabledRef.current = enabled;
  onFinalTextRef.current = onFinalText;

  useEffect(() => {
    const Recognition = getSpeechRecognitionConstructor();
    if (Recognition === null || !enabled) {
      setState((previous) => ({ ...previous, listening: false }));
      return;
    }

    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-PE';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result === undefined || !result.isFinal) continue;
        const alternative = result[0];
        if (alternative === undefined) continue;
        onFinalTextRef.current(alternative.transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopped = true;
        setState((previous) => ({ ...previous, listening: false, permissionDenied: true }));
      }
      // Anything else ('no-speech', 'network', 'aborted'…) is left to `onend`, which
      // restarts — a continuous recognizer errors out of ordinary silence often enough
      // that treating every error as fatal would mean it stops listening within seconds.
    };

    /**
     * `start()` can throw synchronously, not just fail asynchronously via `onend` — most
     * commonly right when this session begins a beat after a *different* recognizer
     * (voice navigation, say) called `stop()` on its own instance: the browser has not
     * finished releasing the microphone yet. That first attempt below used to give up
     * silently on catching it, with nothing left to trigger a retry — since a session
     * that never started can never fire `onend` — so the recognizer stayed dead the
     * whole time a caller like `<QuickRegisterBanner>` believed it was listening. Every
     * attempt, first or retried, now goes through the same path and the same backoff.
     */
    const attemptStart = () => {
      try {
        recognition.start();
        setState((previous) => ({ ...previous, listening: true }));
      } catch {
        setState((previous) => ({ ...previous, listening: false }));
        if (stopped || !enabledRef.current) return;
        restartTimer = setTimeout(attemptStart, RESTART_DELAY_MS);
      }
    };

    recognition.onend = () => {
      setState((previous) => ({ ...previous, listening: false }));
      if (stopped || !enabledRef.current) return;
      restartTimer = setTimeout(attemptStart, RESTART_DELAY_MS);
    };

    attemptStart();

    return () => {
      stopped = true;
      if (restartTimer !== null) clearTimeout(restartTimer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [enabled]);

  return state;
}
