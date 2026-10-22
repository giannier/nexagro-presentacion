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
