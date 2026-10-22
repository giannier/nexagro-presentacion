# Deploy (static export + PHP)

The site builds with `output: 'export'` (see `next.config.mjs`). `npm run build` produces a
static `out/` folder: HTML, CSS, JS, `public/` assets, and the PHP files from `public/api`
and `public/clientes` (copied as-is). No Node server runs in production.

The hosting target is cPanel (user `nexagroe`) with MariaDB; the contact form posts to
`/api/contacts.php` on the same origin. Step-by-step instructions, including the database
and the private config file, are in [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md).

Quick path:

1. `npm install && npm run build`
2. Upload the CONTENTS of `out/` (including the hidden `.htaccess` files) to
   `/home/nexagroe/public_html/`, or use `.cpanel.yml` (copies `out/.` there).
3. Create `/home/nexagroe/nexagro-config/config.php` from `nexagro-config.example.php`.

`out/` must be built locally (or committed): the host has no Node.
