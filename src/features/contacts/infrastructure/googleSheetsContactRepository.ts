import type { ContactRepository } from '@/features/contacts/application/registerContact';

const REQUEST_TIMEOUT_MS = 10_000;

type SheetsResponse = { ok?: unknown; error?: unknown };

/**
 * Adapter: appends each contact as a row through a Google Apps Script web app.
 *
 * Chosen over the Sheets API because it needs no Google Cloud project, no service
 * account and no key file — the script lives inside the spreadsheet itself. The web app
 * URL stays server-side, and every request carries a shared secret the script checks,
 * so knowing the URL alone is not enough to write to the sheet.
 *
 * The script source is in `integrations/google-sheets/Code.gs`.
 */
export function createGoogleSheetsContactRepository(options: {
  readonly webhookUrl: string;
  readonly secret: string;
}): ContactRepository {
  return {
    async save(contact) {
      const response = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: options.secret, contact }),
        // Apps Script answers through a redirect to googleusercontent.com.
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const text = await response.text();

      let payload: SheetsResponse;
      try {
        payload = JSON.parse(text) as SheetsResponse;
      } catch {
        // An HTML page here almost always means the deployment is not set to
        // "Who has access: Anyone", so Google served its sign-in page instead.
        throw new Error(
          `Google Sheets returned a non-JSON response (HTTP ${response.status}). ` +
            'Check the Apps Script deployment access is set to "Anyone".',
        );
      }

      if (payload.ok !== true) {
        throw new Error(`Google Sheets rejected the contact: ${String(payload.error ?? 'unknown')}`);
      }
    },
  };
}
