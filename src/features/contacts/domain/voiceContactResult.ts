import type { ContactTextField } from '@/features/contacts/domain/contact';

/** What the voice-to-contact pipeline (`/api/voice-contact` on the original deployment) returns. */
export type VoiceContactResult = {
  readonly transcript: string;
  readonly fields: Readonly<Record<ContactTextField, string>>;
  readonly missing: readonly string[];
};
