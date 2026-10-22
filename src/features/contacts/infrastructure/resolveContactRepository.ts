import type { ContactRepository } from '@/features/contacts/application/registerContact';
import { createGoogleSheetsContactRepository } from '@/features/contacts/infrastructure/googleSheetsContactRepository';
import { createLocalFileContactRepository } from '@/features/contacts/infrastructure/localFileContactRepository';

/**
 * Composition root for contact storage, driven entirely by environment variables.
 *
 *  - Both Google Sheets variables set -> Google Sheets, wherever the app runs.
 *  - Not set, running off Vercel       -> local JSON Lines file, so the form can be
 *                                         tried on this machine (dev or `next start`).
 *  - Not set, running on Vercel        -> null: the route answers 503 rather than
 *                                         pretending to save into a function filesystem
 *                                         that is thrown away after the request.
 *
 * The check is "on Vercel" rather than "in production" on purpose: the ephemeral
 * filesystem is a property of the host, and `next start` on a local machine is a
 * production build with a perfectly durable disk. Vercel always sets `VERCEL`.
 */
export function resolveContactRepository(): ContactRepository | null {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim();

  if (webhookUrl && secret) {
    return createGoogleSheetsContactRepository({ webhookUrl, secret });
  }

  if (!process.env.VERCEL) {
    return createLocalFileContactRepository();
  }

  return null;
}
