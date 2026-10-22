# Plan: NEXAGRO presentation site on cPanel + MariaDB

Executor: OpenCode + DeepSeek Flash (free). Work phase by phase. Do NOT start a phase
until the previous one passes its check. Keep each change small.

## Context (verified in `WEB-PRESENTACION2.0`)

- Next.js 15 + React 19 + R3F/three, `output: 'export'` -> static `out/` folder. Keep it.
- cPanel deploy already exists: `.cpanel.yml` copies `out/.` to the domain folder.
- Form `src/components/ui/ContactFormDialog.tsx` POSTs JSON to `${API_BASE_URL}/api/contacts`.
  `API_BASE_URL` (`src/lib/apiBaseUrl.ts`) points to the old Vercel deployment.
- Expected API contract (do not change the frontend contract):
  - success: HTTP 200 `{ "ok": true }`
  - validation error: HTTP 422 `{ "ok": false, "errors": { "<field>": "<message>" } }`
  - other failure: HTTP 4xx/5xx `{ "ok": false, "message": "<text>" }`
- Validation rules live in `src/features/contacts/domain/contact.ts` (fields, max lengths,
  email/phone/website rules, consent, honeypot field `nickname`). PHP must replicate them.
- Voice features (`VoiceRecorder`, `QuickRegisterBanner`, `/api/voice-contact`,
  `/api/quick-*`) depend on an AI service running on Vercel. Out of scope.

## Target architecture

```
public/api/contacts.php        POST  save contact (public, validated, rate-limited)
public/api/db.php              PDO connection helper (reads config outside web root)
public/clientes/index.php      Protected page listing all registered contacts
public/clientes/.htaccess      (optional) extra hardening
sql/schema.sql                 MariaDB table
```

`public/` is copied by Next into `out/`, and `.cpanel.yml` copies `out/` to the server,
so PHP files placed in `public/` get deployed with no extra tooling.

Config with DB credentials lives OUTSIDE the web root:
`/home/<cpanel_user>/nexagro-config/config.php` (never in git, never in `out/`).

## Phase 0 - Prepare the project

1. Copy `WEB-PRESENTACION2.0` into `WEB-PRESENTACION-NEXAGRO` (exclude `node_modules`,
   `.next`, `.env.local`, `.git`). Do not copy `.env.local` (Vercel token).
2. `npm install`, `npm run build`, confirm `out/` is generated.
3. Update `.cpanel.yml` `DEPLOYPATH` to the NEXAGRO domain folder (ask the user for it).

Check: `npm run typecheck` and `npm run build` pass.

## Phase 1 - Database (user does it in cPanel)

Provide `sql/schema.sql`:

```sql
CREATE TABLE contacts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(120) NOT NULL,
  job_title        VARCHAR(120) NOT NULL DEFAULT '',
  company_name     VARCHAR(160) NOT NULL,
  industry         VARCHAR(120) NOT NULL,
  email            VARCHAR(160) NOT NULL DEFAULT '',
  phone            VARCHAR(30)  NOT NULL DEFAULT '',
  website          VARCHAR(200) NOT NULL DEFAULT '',
  instagram        VARCHAR(200) NOT NULL DEFAULT '',
  facebook         VARCHAR(200) NOT NULL DEFAULT '',
  linkedin         VARCHAR(200) NOT NULL DEFAULT '',
  tiktok           VARCHAR(200) NOT NULL DEFAULT '',
  notes            TEXT NULL,
  interest_company VARCHAR(160) NOT NULL DEFAULT '',
  consent_at       DATETIME NOT NULL,
  ip_hash          CHAR(64) NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at),
  INDEX idx_ip_created (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

User steps in cPanel: MySQL Databases -> create DB + user (all privileges) -> phpMyAdmin
-> run the SQL. Then create `/home/<user>/nexagro-config/config.php`:

```php
<?php
return [
  'db_host' => 'localhost', 'db_name' => '...', 'db_user' => '...', 'db_pass' => '...',
  'admin_user' => 'admin',
  'admin_pass_hash' => '<output of password_hash(...)>',
  'ip_salt' => '<random string>',
];
```

## Phase 2 - Backend (`public/api`)

`db.php`: load config (path via `dirname(__DIR__, 3)` or absolute), PDO with
`ERRMODE_EXCEPTION`, `utf8mb4`, `emulate_prepares=false`.

`contacts.php` rules:
1. Only POST; otherwise 405. Read JSON body; invalid JSON -> 400.
2. Honeypot `nickname` non-empty -> return `{ok:true}` silently, save nothing.
3. Rate limit: max 10 inserts per `ip_hash` per hour (query by `idx_ip_created`) -> 429.
   `ip_hash = hash('sha256', ip . salt)` - never store raw IPs.
4. Replicate validation from `contact.ts` (trim, collapse spaces, max lengths, required
   fullName/companyName/industry, email regex, phone 6-15 digits, email OR phone,
   website normalised to https, consent === true). Return 422 with the same field keys
   and the same Spanish messages.
5. Insert with prepared statements ONLY. Never concatenate SQL.
6. Headers: `Content-Type: application/json; charset=utf-8`. No CORS headers (same origin).
7. On exception: log with `error_log`, return 500 `{ok:false,message:"..."}` - never leak
   the exception text.

Check: `curl -X POST` valid payload -> row appears in phpMyAdmin; bad payload -> 422.

## Phase 3 - Wire the frontend

1. `src/lib/apiBaseUrl.ts`: `export const API_BASE_URL = '';` (same origin).
2. `ContactFormDialog.tsx`: fetch `${API_BASE_URL}/api/contacts.php`.
3. Remove voice UI: delete `VoiceRecorder` usage in `ContactFormDialog.tsx` and
   `QuickRegisterBanner` usage in `CompanyHud.tsx` (plus the "registrar cliente" voice
   command branch). Delete now-unused files only after typecheck confirms no references.
4. Remove unused server adapters (`googleSheets*`, `localFile*`, `resolveContactRepository`)
   or leave them untouched if removal risks breaking imports - prefer leaving them.
5. Local test: PHP is not served by `next dev`. Test the form against the deployed
   domain, or run `php -S localhost:8080 -t out` after `npm run build` (needs PHP + a
   local MariaDB; optional).

Check: `npm run typecheck` + `npm run build` pass; no `vercel.app` string remains
(`rg vercel src`).

## Phase 4 - Clients page (`public/clientes/index.php`)

Decision: this page lists personal data, so it MUST be protected (Peru Law 29733 on
personal data). Do not make it public.

- PHP session login (username + `password_verify` against `admin_pass_hash`).
- `session_set_cookie_params` with `httponly`, `secure`, `samesite=Strict`;
  `session_regenerate_id(true)` on login; CSRF token on login/logout forms.
- Brute-force guard: sleep 1s on failure + max 5 attempts per session/IP per 15 min.
- After login: `SELECT ... ORDER BY created_at DESC`, render a table (name, company,
  industry, email, phone, interest company, date) with client-side search box and
  pagination (50 per page). Escape EVERY value with `htmlspecialchars(..., ENT_QUOTES)`.
- Match the site's visual identity (colors from `src/app/globals.css`, same fonts).
- Add "Download CSV" button (UTF-8 BOM so Excel opens accents correctly).
- Add `<meta name="robots" content="noindex">`.

Check: wrong password rejected; page unreachable without session; XSS test with
`<script>` in a contact name renders as text.

## Phase 5 - Deploy and verify

1. `npm run build`; verify `out/api/contacts.php` and `out/clientes/index.php` exist.
2. Push/deploy so `.cpanel.yml` copies `out/.` to the domain folder (or upload via File
   Manager/FTP).
3. In cPanel set PHP >= 8.1. Confirm HTTPS is forced (`.htaccess` redirect).
4. Smoke test on the live domain: submit form -> row in DB -> visible in `/clientes/`.

## Guardrails for the executor

- Never commit or deploy `config.php`, DB passwords, or `.env*`.
- Prepared statements only; escape all HTML output.
- Do not touch the 3D wheel / visuals (`src/components/wheel`, `scene`, `globals.css`).
- Conventional commits, no AI attribution lines.
- If a phase check fails, fix it before moving on; do not stack changes.
