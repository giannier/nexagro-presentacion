/**
 * Google Apps Script web app: receives networking contacts from the website and
 * appends each one as a row in this spreadsheet.
 *
 * Setup (once):
 *   1. In the spreadsheet: Extensions > Apps Script. Replace everything with this file.
 *   2. Change WEBHOOK_SECRET below to a long random value of your own.
 *   3. Deploy > New deployment > type "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   4. Copy the web app URL. In Vercel set:
 *        GOOGLE_SHEETS_WEBHOOK_URL    = that URL
 *        GOOGLE_SHEETS_WEBHOOK_SECRET = the same value as WEBHOOK_SECRET
 *
 * "Anyone" is required so the website's server can reach the script without a Google
 * login. The secret is what stops anyone else who finds the URL from writing rows.
 *
 * After editing this script, publish the change with Deploy > Manage deployments >
 * Edit > Version: New version. Saving alone does not update the live web app.
 */

const WEBHOOK_SECRET = 'CAMBIA-ESTA-CLAVE-POR-UNA-LARGA-Y-SECRETA';

const SHEET_NAME = 'Contactos';

/**
 * Column order in the sheet. Each entry maps a header to a field sent by the site.
 *
 * The two filtering columns come first — "Empresa del grupo de interés" (which of the
 * nineteen companies the contact showed interest in) and "Área o rubro" (the contact's
 * own industry) — so a Sheets filter or pivot table set up against columns A/B keeps
 * working as new rows are appended, instead of pointing at whichever columns happened
 * to be first before.
 */
const COLUMNS = [
  ['Empresa del grupo de interés', 'interestCompany'],
  ['Área o rubro', 'industry'],
  ['Fecha de registro', 'consentAt'],
  ['Nombre', 'fullName'],
  ['Cargo', 'jobTitle'],
  ['Empresa', 'companyName'],
  ['Correo', 'email'],
  ['Teléfono', 'phone'],
  ['Página web', 'website'],
  ['Instagram', 'instagram'],
  ['Facebook', 'facebook'],
  ['LinkedIn', 'linkedin'],
  ['TikTok', 'tiktok'],
  ['Notas', 'notes'],
];

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    return respond({ ok: false, error: 'invalid_json' });
  }

  if (!payload || payload.secret !== WEBHOOK_SECRET) {
    return respond({ ok: false, error: 'unauthorized' });
  }

  const contact = payload.contact || {};

  // Two submissions arriving together must not both write to the same "next row".
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    sheet.appendRow(COLUMNS.map(function (column) {
      return sanitize(contact[column[1]]);
    }));
    return respond({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    const headers = COLUMNS.map(function (column) { return column[0]; });
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Stores every value as plain text.
 *
 * A value starting with = + - or @ would otherwise be evaluated by Sheets as a formula:
 * a phone number like +51 999 would break, and a malicious submission could inject a
 * formula into the spreadsheet. The leading apostrophe is hidden by Sheets.
 */
function sanitize(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function respond(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
