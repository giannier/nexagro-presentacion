# Deploy NEXAGRO on cPanel (MariaDB)

cPanel user: `nexagroe` - web root: `/home/nexagroe/public_html`

1. **PHP version**: cPanel > MultiPHP Manager > set the domain to PHP 8.1 or newer.
2. **Database**: cPanel > MySQL Databases > create a database and a user, add the user to the
   database with ALL PRIVILEGES. Note the full names (prefixed with `nexagroe_`).
3. **Schema**: cPanel > phpMyAdmin > select the database > SQL tab > paste `sql/schema.sql` > Go.
4. **Config (outside the web root)**: in File Manager create `/home/nexagroe/nexagro-config/` and
   a file `config.php` based on `nexagro-config.example.php`. Fill in the DB name, user and
   password, and generate:
   - the admin hash: `php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT);"`
   - the IP salt: `php -r "echo bin2hex(random_bytes(32));"`
   Never place this file inside `public_html`.
5. **Build locally**: `npm install` then `npm run build`. The result is the `out/` folder.
6. **Deploy**: upload the CONTENTS of `out/` (including the hidden `.htaccess`) to
   `/home/nexagroe/public_html/` via File Manager/FTP, or push to the repo and use
   cPanel > Git Version Control > Deploy HEAD Commit (`.cpanel.yml` copies `out/.` there;
   `out/` must be committed because the host has no Node).
7. **HTTPS**: make sure the domain has an SSL certificate (AutoSSL). `.htaccess` forces HTTPS.
8. **Smoke test**: submit the form on the site, then open `https://<domain>/clientes/`, log in
   and check the row appears. Try a wrong password and confirm it is rejected.

## Voice features (n8n + OpenAI)

The voice buttons call `/api/quick-register.php`, `/api/voice-contact.php` and
`/api/quick-contact.php`. The first two forward to two n8n workflows that call OpenAI; the
OpenAI key lives only in n8n (credential `OpenAI CAPACITA`), never on this host.

1. **Existing installs: run this once in phpMyAdmin** (new rate-limit table; also in `sql/schema.sql`):
   ```sql
   CREATE TABLE IF NOT EXISTS api_calls (
     id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     endpoint   VARCHAR(32) NOT NULL,
     ip_hash    CHAR(64)    NOT NULL,
     created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_endpoint_ip_created (endpoint, ip_hash, created_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
   ```
2. **Import the workflows ONE AT A TIME** in n8n (Workflows > Import from File). n8n cannot publish a
   workflow that holds two webhooks, and cannot activate two workflows sharing a method + path:
   - `nexagro-config/nexagro-quick-register.workflow.READY.json` (webhook `nexagro-quick-register`)
   - `nexagro-config/nexagro-voice-contact.workflow.READY.json` (webhook `voice-contact`)
   The `READY` files already contain the secret (they are gitignored; never share them). The repo copies in
   `integrations/n8n/` carry the placeholder `REPLACE_WITH_SHARED_SECRET` in the "Check Secret" node and
   must be edited before use. After any edit press **Save** and then **Publish**: production webhooks run the
   last published version, not the draft.
3. **Credential**: the three OpenAI nodes (`Extract Client Fields`, `Transcribe Audio`,
   `Extract Contact Fields`) reference `OpenAI CAPACITA`. If n8n does not find it by id, open each
   node and select your OpenAI credential.
4. **Activate** the workflow (toggle top right). The production URL
   `https://<n8n-host>/webhook/nexagro-quick-register` (and `/webhook/voice-contact`) only works while the
   workflow is active; `/webhook-test/...` only works while "Listen for test event" is running.
5. **config.php** (`/home/nexagroe/nexagro-config/config.php`): set `n8n_quick_register_url` and
   `n8n_voice_contact_url` to the production URLs (replace `YOUR-N8N-HOST`). `n8n_secret` must equal
   the secret inside the workflow (the READY file and the shipped `config.php` already match).
   Re-upload `config.php`.
6. **PHP limits**: audio is capped at 5 MB. `upload_max_filesize` and `post_max_size` should be
   at least 8M (cPanel > MultiPHP INI Editor); cURL and `fileinfo` extensions must be enabled
   (they are by default on cPanel).
7. **Smoke test** (replace the domain):
   ```bash
   # 405 expected
   curl -i https://DOMAIN/api/quick-register.php
   # transcript -> {"ok":true,"fields":{...},"missing":[...]}
   curl -s -X POST https://DOMAIN/api/quick-register.php -H 'Content-Type: application/json'      -d '{"transcript":"Me llamo Juan Perez, mi numero es 989 797 977 y trabajo en agroexportacion"}'
   # audio -> {"ok":true,"transcript":"...","fields":{...},"missing":[...]}
   curl -s -X POST https://DOMAIN/api/voice-contact.php -F audio=@sample.webm
   # saves a row in contacts
   curl -s -X POST https://DOMAIN/api/quick-contact.php -H 'Content-Type: application/json'      -d '{"fullName":"Juan Perez","phone":"989797977","industry":"Agro","interestCompany":"NEXAGRO Export"}'
   ```
   Limits per IP and hour: quick-register 120, voice-contact 20, quick-contact 30 (HTTP 429 after that).
   Browsers only allow the microphone on HTTPS, and voice commands need Chrome/Edge/Safari speech recognition.


### n8n path conflict

The quick-register webhook uses the unique path `nexagro-quick-register` (not `quick-register`, which an
older workflow may already own). If a workflow with the same path is already active, delete or deactivate
it before importing, or n8n will report a conflict.

### Quick-register now captures company and email

Deploy order: **update the n8n workflow first** (delete the old "NEXAGRO Quick Register" workflow, import the new
`nexagro-config/nexagro-quick-register.workflow.READY.json`, Save + Publish), **then deploy the site**.
The banner needs the four required fields (name, phone, company, rubro); it then waits about 6 seconds for an
optional email (or the word "guardar") before saving. With the old workflow the company never arrives and the
banner would keep listening, so do not deploy the site first.

