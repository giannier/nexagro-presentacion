import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { SocialIcon } from '@/components/social/SocialIcon';
import { ExternalIcon, MailIcon, PhoneIcon } from '@/components/ui/icons';
import { COMPANIES, getLogoPath } from '@/data/companies';
import { profileFor } from '@/data/companyProfiles';
import { legalNameFor, rucFor } from '@/data/companyRuc';
import { socialLinksFor } from '@/data/companySocials';
import { SOCIAL_NETWORKS } from '@/data/socialNetworks';

type PageProps = {
  readonly params: Promise<{ slug: string }>;
};

/**
 * Landing page behind each company's QR code.
 *
 * Opened on a phone straight from the camera, so it is built mobile-first and fully
 * static: one prerendered page per company, no client JavaScript required. Each button
 * links to the public profile URL, which the phone hands to the installed app — the
 * visitor lands on the profile with "Follow" one tap away.
 *
 * Following automatically is not possible: every network requires the user to tap
 * Follow themselves, precisely to stop pages from doing it on their behalf.
 */

// Only the known companies exist; anything else is a 404 at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPANIES.map((company) => ({ slug: company.slug }));
}

function findCompany(slug: string) {
  return COMPANIES.find((company) => company.slug === slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = findCompany(slug);
  if (company === undefined) return {};

  return {
    title: `${company.name} | Redes sociales`,
    description: `Sigue a ${company.name} en sus redes sociales oficiales.`,
  };
}

export default async function CompanySocialPage({ params }: PageProps) {
  const { slug } = await params;
  const company = findCompany(slug);
  if (company === undefined) notFound();

  const links = socialLinksFor(company.slug);
  const email = profileFor(company.slug).email;
  const phone = profileFor(company.slug).phone;
  const ruc = rucFor(company.slug);
  const legalName = legalNameFor(company.slug);
  const websiteHost = company.url === '' ? '' : new URL(company.url).host;

  return (
    // The root layout locks document scroll for the wheel; this page scrolls itself.
    <div className="h-dvh overflow-y-auto bg-white text-neutral-900">
      <main className="mx-auto flex min-h-full w-full max-w-md flex-col items-center px-6 pb-10 pt-12">
        <Image
          src={getLogoPath(company.slug)}
          alt={`Logo de ${company.name}`}
          width={176}
          height={176}
          priority
          className="h-44 w-44 object-contain"
        />

        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight">{company.name}</h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          {links.length > 0
            ? 'Síguenos en nuestras redes sociales oficiales'
            : 'Muy pronto compartiremos nuestras redes sociales'}
        </p>

        {links.length > 0 && (
          <ul className="mt-8 flex w-full flex-col gap-3">
            {links.map(({ network, url }) => {
              const meta = SOCIAL_NETWORKS[network];
              return (
                <li key={network}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: meta.color }}
                    className={[
                      'flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-base font-semibold text-white',
                      'shadow-sm transition-transform active:scale-[0.98]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
                    ].join(' ')}
                  >
                    <SocialIcon network={network} className="h-6 w-6 shrink-0" />
                    <span className="flex-1">{meta.action}</span>
                    <ExternalIcon className="h-4 w-4 shrink-0 opacity-70" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {company.url !== '' && (
        <a
          href={company.url}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'mt-4 flex w-full items-center gap-4 rounded-2xl border border-neutral-200 px-5 py-4',
            'text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
          ].join(' ')}
        >
          <ExternalIcon className="h-6 w-6 shrink-0 text-neutral-500" />
          <span className="flex-1">
            Visitar sitio web
            <span className="block text-xs font-normal text-neutral-500">{websiteHost}</span>
          </span>
        </a>
        )}

        {phone !== '' && (
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className={[
              'mt-4 flex w-full items-center gap-4 rounded-2xl border border-neutral-200 px-5 py-4',
              'text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-50',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
            ].join(' ')}
          >
            <PhoneIcon className="h-6 w-6 shrink-0 text-neutral-500" />
            <span className="flex-1">
              Llamar o escribir
              <span className="block text-xs font-normal text-neutral-500">{phone}</span>
            </span>
          </a>
        )}

        {email !== '' && (
          <a
            href={`mailto:${email}`}
            className={[
              'mt-4 flex w-full items-center gap-4 rounded-2xl border border-neutral-200 px-5 py-4',
              'text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-50',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
            ].join(' ')}
          >
            <MailIcon className="h-6 w-6 shrink-0 text-neutral-500" />
            <span className="flex-1">
              Escribir por correo
              <span className="block text-xs font-normal text-neutral-500">{email}</span>
            </span>
          </a>
        )}

        {(legalName !== undefined || ruc !== undefined) && (
          <p className="mt-auto pt-12 text-center text-[0.65rem] leading-relaxed text-neutral-500">
            {legalName}
            {legalName !== undefined && ruc !== undefined && <br />}
            {ruc !== undefined && `RUC ${ruc}`}
          </p>
        )}
        <p className="pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-neutral-400">
          NEXAGRO Export
        </p>
      </main>
    </div>
  );
}
