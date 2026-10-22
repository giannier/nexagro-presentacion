'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';

import { SocialIcon } from '@/components/social/SocialIcon';
import { ExternalIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { getLogoPath, type Company } from '@/data/companies';
import { socialLinksFor } from '@/data/companySocials';
import { logoAspectRatio } from '@/data/logoAspectRatios';
import { SOCIAL_NETWORKS } from '@/data/socialNetworks';

type QrDialogProps = {
  readonly company: Company;
  readonly open: boolean;
  readonly onClose: () => void;
};

const QR_SIZE = 236;
/** Longer side of the centre mark. The shorter side is derived from the logo's shape. */
const QR_LOGO_SIZE = 52;
const LOCAL_HOST_PATTERN = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/;

/**
 * The public origin the QR code should point at.
 *
 * `NEXT_PUBLIC_SITE_URL` pins it to the production domain. Without it the current
 * origin is used, which is right on the published site and on a LAN address, and wrong only on
 * localhost — the dialog warns about that case explicitly.
 */
function resolveSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return window.location.origin;
}

/**
 * "QR de información": a scannable code that opens the company's social links page.
 */
export function QrDialog({ company, open, onClose }: QrDialogProps) {
  const target = useMemo(() => `${resolveSiteOrigin()}/redes/${company.slug}`, [company.slug]);
  const isLocalOnly = useMemo(() => LOCAL_HOST_PATTERN.test(new URL(target).hostname), [target]);
  const links = socialLinksFor(company.slug);

  /**
   * qrcode.react stretches the centre image to exactly `width` × `height`
   * (`preserveAspectRatio="none"`), so a fixed square box would squash any logo that
   * is not itself square. Sizing the box to the logo's real aspect ratio keeps the mark
   * legible instead of visibly warped — and shrinks the excavated hole in the QR
   * pattern for a squat logo, if anything making the code easier to scan, not harder.
   */
  const aspect = logoAspectRatio(company.slug);
  const logoWidth = aspect >= 1 ? QR_LOGO_SIZE : QR_LOGO_SIZE * aspect;
  const logoHeight = aspect >= 1 ? QR_LOGO_SIZE / aspect : QR_LOGO_SIZE;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company.name}
      description="Escanea el código para ver y seguir nuestras redes sociales."
    >
      <div className="flex flex-col items-center">
        <div className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
          <QRCodeSVG
            value={target}
            size={QR_SIZE}
            // "H" survives the logo punched into the centre (up to ~30% damage).
            level="H"
            marginSize={0}
            fgColor="#0b0d12"
            bgColor="#ffffff"
            title={`Código QR de redes sociales de ${company.name}`}
            imageSettings={{
              src: getLogoPath(company.slug),
              width: logoWidth,
              height: logoHeight,
              excavate: true,
            }}
          />
        </div>

        {links.length > 0 ? (
          <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Redes disponibles">
            {links.map(({ network }) => (
              <li
                key={network}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                <SocialIcon network={network} className="h-3.5 w-3.5" />
                {SOCIAL_NETWORKS[network].label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-center text-sm text-neutral-500">
            Esta empresa aún no tiene redes sociales registradas.
          </p>
        )}

        {isLocalOnly && (
          <p
            role="note"
            className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs leading-relaxed text-amber-900"
          >
            Estás en <strong>localhost</strong>: un celular no podrá abrir este código. Abre esta
            página desde la IP de tu red o desde el sitio publicado.
          </p>
        )}

        <a
          href={target}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          Abrir la página de redes
          <ExternalIcon className="h-4 w-4" />
        </a>
      </div>
    </Modal>
  );
}
