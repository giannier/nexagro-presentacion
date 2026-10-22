'use client';

import { useCallback } from 'react';

import { useSpeechRecognizer, type SpeechRecognizerState } from '@/hooks/useSpeechRecognizer';
import { parseVoiceCommand, type VoiceCommand } from '@/lib/voiceIntent';

export type VoiceControlState = SpeechRecognizerState;

/**
 * Always-on voice navigation: while `enabled`, continuously listens and turns every
 * recognised phrase into a `VoiceCommand` via `parseVoiceCommand`, calling `onCommand`
 * for anything that is not `{ type: 'none' }`. The microphone session itself is owned by
 * `useSpeechRecognizer`; this hook only adds the command-parsing layer on top of it.
 */
export function useVoiceControl(enabled: boolean, onCommand: (command: VoiceCommand) => void): VoiceControlState {
  const handleFinalText = useCallback(
    (text: string) => {
      const command = parseVoiceCommand(text);
      if (command.type !== 'none') onCommand(command);
    },
    [onCommand],
  );

  return useSpeechRecognizer(enabled, handleFinalText);
}
