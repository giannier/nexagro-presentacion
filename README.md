# NEXAGRO Export - presentation site

Interactive 3D presentation of NEXAGRO Export: the logo on a white stage, a showcase panel
and action buttons. Built with Next.js 15 (static export), React 19 and react-three-fiber.
Hosted on cPanel with a PHP + MariaDB backend.

## Buttons

| Button | What it does |
| --- | --- |
| **Ingresar a la web** | Opens the company website (`url` in `src/data/companies.ts`; hidden when empty) |
| **QR de información** | QR code that opens `/redes/nexagro`, the social links page |
| **Formulario** | Contact form; saves to MariaDB through `/api/contacts.php` |
| **Portafolio / Catálogo** | Appear only when items exist in `src/data/companyPortfolio.ts` |

## Structure

```
src/app/                 layout, home page, redes/[slug] (QR target)
src/components/          scene, wheel, showcase, ui
src/data/                single NEXAGRO entry: companies, colors, profiles, socials
src/features/contacts/   contact validation rules (shared by browser and PHP)
public/logos/nexagro.png (WebGL texture) and nexagro.svg  logo
public/api/              contacts.php (public API), db.php (PDO + config loader)
public/clientes/         password-protected list of registered contacts (+ CSV export)
sql/schema.sql           MariaDB table
nexagro-config.example.php  template for the private config (never commit the real one)
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000 (PHP is not served by next dev)
npm run typecheck
npm run build      # writes the static site to out/
```

To test the PHP API locally: `npm run build`, then `php -S localhost:8080 -t out` (needs a
local MariaDB and a config file; see the example config).

## Updating company data

- Website, name: `src/data/companies.ts`.
- Social profiles (QR page): `src/data/companySocials.ts`; only add verified official ones.
- Headline, phone, email: `src/data/companyProfiles.ts`; RUC: `src/data/companyRuc.ts`.
- Logo: replace `public/logos/nexagro.png`; update the aspect ratio in
  `src/data/logoAspectRatios.ts` if its shape changes.

## Backend and clients page

- `POST /api/contacts.php`: validates (same rules and Spanish messages as
  `src/features/contacts/domain/contact.ts`), rate-limits per hashed IP, inserts with
  prepared statements. Raw IPs are never stored.
- `/clientes/`: login with PHP sessions, CSRF protection and a brute-force guard; search,
  pagination (50) and CSV download. Not indexed by search engines.
- Credentials live outside the web root in `/home/nexagroe/nexagro-config/config.php`.

## Deploy

See [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md) (full steps) and [DEPLOY-STATIC.md](DEPLOY-STATIC.md).
