import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { ContactRepository } from '@/features/contacts/application/registerContact';

/**
 * Adapter for local development only: one JSON object per line in `.data/contacts.jsonl`.
 *
 * Lets the form be exercised end to end before Google Sheets is connected. Never used
 * in production — Vercel functions have no persistent filesystem, so anything written
 * there would silently disappear.
 */
export function createLocalFileContactRepository(): ContactRepository {
  const directory = path.join(process.cwd(), '.data');
  const file = path.join(directory, 'contacts.jsonl');

  return {
    async save(contact) {
      await mkdir(directory, { recursive: true });
      // Append-only JSON Lines: concurrent submissions never rewrite each other's data.
      await appendFile(file, `${JSON.stringify(contact)}\n`, 'utf8');
    },
  };
}
