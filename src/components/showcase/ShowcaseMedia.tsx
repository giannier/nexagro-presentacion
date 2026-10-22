'use client';

import { useEffect, useState } from 'react';

import { getLogoPath, type Company } from '@/data/companies';
import { coverFor } from '@/data/companyCovers';
import { profileFor } from '@/data/companyProfiles';

type ShowcaseMediaProps = {
  readonly company: Company;
  readonly color: string;
};

/**
 * Reference artwork for the focused company: image, video, or a branded fallback.
 *
 * The file comes from the manifest in `src/data/companyCovers.ts`. A company with no
 * artwork yet falls back to a gradient in its own colour rather than a broken image.
 */
export function ShowcaseMedia({ company, color }: ShowcaseMediaProps) {
  const media = profileFor(company.slug).media ?? coverFor(company.slug);
  const [failed, setFailed] = useState(false);

  // Each company gets a fresh attempt; otherwise one unreadable file would keep every
  // later company on the fallback.
  useEffect(() => {
    setFailed(false);
  }, [company.slug]);

  if (media === undefined || failed) {
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 90% at 20% 15%, ${color}f2 0%, ${color}b8 45%, #050807 100%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getLogoPath(company.slug)}
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 w-[62%] max-w-md -translate-x-1/2 -translate-y-1/2 object-contain opacity-15 mix-blend-luminosity"
        />
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <video
        key={media.src}
        src={media.src}
        poster={media.poster}
        autoPlay
        muted
        loop
        playsInline
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: media.focus }}
      />
    );
  }

  return (
    <picture className="absolute inset-0 block">
      {/* Landscape = tall panel (see `.showcase-panel` in globals.css): the tall crop
          frames the subject instead of cropping the wide original down to a sliver. */}
      {media.landscapeSrc !== undefined && (
        <source media="(orientation: landscape)" srcSet={media.landscapeSrc} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={media.src}
        src={media.src}
        alt={`Imagen referencial de ${company.name}`}
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: media.focus }}
      />
    </picture>
  );
}
