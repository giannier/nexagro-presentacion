'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';

import { ShowcaseMedia } from '@/components/showcase/ShowcaseMedia';
import { GlobeIcon, MailIcon, PhoneIcon } from '@/components/ui/icons';
import { useWheel } from '@/context/WheelContext';
import { COMPANIES } from '@/data/companies';
import { companyColor } from '@/data/companyColors';
import { profileFor } from '@/data/companyProfiles';
import { SHOWCASE_SWAP_DURATION, SHOWCASE_SWAP_OFFSET_X } from '@/lib/constants';

/**
 * Left panel: reference artwork for the focused company, its headline and its contacts.
 *
 * The angled edge is two stacked clip paths — the outer one painted in the company's
 * brand colour, the inner one carrying the artwork and inset by a few pixels — so the
 * diagonal reads as a coloured band that changes with every company.
 *
 * It reads the active company from context itself rather than taking it as a prop, so a
 * company change re-renders this panel without touching the canvas subtree.
 */
export function CompanyShowcase() {
  const { activeIndex } = useWheel();
  const contentRef = useRef<HTMLDivElement>(null);
  const company = COMPANIES[activeIndex];

  useEffect(() => {
    const element = contentRef.current;
    if (element === null) return;

    const tween = gsap.fromTo(
      element,
      { opacity: 0, x: SHOWCASE_SWAP_OFFSET_X },
      { opacity: 1, x: 0, duration: SHOWCASE_SWAP_DURATION, ease: 'power2.out', overwrite: true },
    );

    return () => {
      tween.kill();
    };
  }, [activeIndex]);

  if (company === undefined) return null;

  const color = companyColor(company.slug);
  // Inverted from the earlier WCAG-picked ink/white choice: the client wants every
  // painted stroke to carry white text regardless of how light the brand colour is.
  const textColor = '#ffffff';
  const profile = profileFor(company.slug);
  const websiteHost = company.url === '' ? '' : new URL(company.url).host.replace(/^www\./, '');

  return (
    <section
      aria-label={`Presentación de ${company.name}`}
      className="showcase-panel relative shrink-0 overflow-hidden bg-neutral-950"
      style={{ backgroundColor: color }}
    >
      <div className="showcase-media absolute inset-0 overflow-hidden bg-neutral-950">
        <ShowcaseMedia company={company} color={color} />
        {/*
          Protective vignette: dark near the top and bottom, clear through the middle so
          the photo still reads. Kept as a base layer under the highlighter marks below —
          it is what still protects the coloured accent word, which deliberately gets no
          marker of its own.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.72) 100%)',
          }}
        />
      </div>

      {/* `isolate`: the brush strokes use -z-10; without their own stacking context they would
          sink behind the media layer above and never be seen. */}
      {/* Portrait layouts clip the panel into a shallow V (`clip-path` in globals.css), so
          the bottom padding has to clear that notch; the landscape polygon is flat along
          the bottom edge and keeps the normal padding. */}
      <div className="relative isolate flex h-full flex-col justify-between px-4 pb-10 pt-4 sm:px-8 sm:pb-12 sm:pt-8 lg:px-10 lg:pt-10 landscape:pb-4 landscape:sm:pb-8 landscape:lg:pb-10">
        <header className="relative inline-block self-start px-3 py-2 sm:px-4 sm:py-2.5">
          <BrushStroke color={color} />
          <p
            className="relative text-[0.58rem] font-semibold uppercase tracking-[0.42em] sm:text-[0.68rem]"
            style={{ color: textColor }}
          >
            {company.name}
          </p>
        </header>

        {/*
          One consistent width for the headline, subtitle and contacts — previously the
          headline alone stretched to max-w-xl while everything below it was capped at
          max-w-md, so a long lead/highlight/tail ran as one wide line on a company whose
          copy happened to be long, while a shorter company's headline broke tidily. A
          narrower, shared cap makes every company's copy wrap into short lines instead
          of only some of them getting that by accident of their own word count.
        */}
        <div ref={contentRef} className="max-w-md">
          {/*
            One stroke under the whole headline block — lead, accent word and tail
            together with the subtitle — so every line of text above the divider sits on
            painted colour, the accent word included. It used to be left bare because it
            was already rendered in the brand colour; now that every line reads in white,
            leaving it uncovered would mean it was the only line without a background.
          */}
          {(profile.lead !== '' || profile.highlight !== '' || profile.tail !== '' || profile.subtitle !== '') && (
            <div className="relative px-3 py-2 sm:px-5 sm:py-3">
              <BrushStroke color={color} />
              {profile.lead !== '' && (
                <p
                  className="relative text-balance text-xl font-bold leading-[1.25] sm:text-2xl sm:leading-[1.3] lg:text-3xl"
                  style={{ color: textColor }}
                >
                  {profile.lead}
                </p>
              )}
              {profile.highlight !== '' && (
                <p
                  className={`relative text-xl font-bold leading-[1.25] sm:text-2xl sm:leading-[1.3] lg:text-3xl ${profile.lead !== '' ? 'mt-1' : ''}`}
                  style={{ color: textColor }}
                >
                  {profile.highlight}
                </p>
              )}
              {profile.tail !== '' && (
                <p
                  className={`relative text-balance text-xl font-bold leading-[1.25] sm:text-2xl sm:leading-[1.3] lg:text-3xl ${profile.highlight !== '' || profile.lead !== '' ? 'mt-1' : ''}`}
                  style={{ color: textColor }}
                >
                  {profile.tail}
                </p>
              )}
              {profile.subtitle !== '' && (
                // Clamped as a safety net, not a routine limit — every subtitle on file
                // already fits on one or two lines; this only guards a future long one.
                <p
                  className={`relative line-clamp-2 text-xs sm:text-sm lg:text-base ${profile.tail !== '' || profile.highlight !== '' || profile.lead !== '' ? 'mt-1.5 sm:mt-3' : ''}`}
                  style={{ color: textColor, opacity: 0.85 }}
                >
                  {profile.subtitle}
                </p>
              )}
            </div>
          )}

          <div className="mt-2 h-px w-full bg-white/20 sm:mt-5" />

          {/*
            One contact per row, always — not a wrapping chip row that happened to break
            nicely for a company with a long email and ran as one long line for a company
            with a short one. A fixed vertical list looks identically organised for every
            company regardless of how long its phone, email or domain are.
          */}
          <ul className="mt-2 flex flex-col items-start gap-1.5 text-[0.68rem] text-white/85 sm:mt-4 sm:gap-2.5 sm:text-xs">
            {profile.phone !== '' && (
              <ContactItem
                href={`tel:${profile.phone.replace(/\s/g, '')}`}
                color={color}
                icon={<PhoneIcon className="h-3 w-3" />}
                label={`Cel. ${profile.phone}`}
              />
            )}
            {profile.email !== '' && (
              <ContactItem
                href={`mailto:${profile.email}`}
                color={color}
                icon={<MailIcon className="h-3 w-3" />}
                label={profile.email}
              />
            )}
            {company.url !== '' && (
              <ContactItem
                href={company.url}
                color={color}
                external
                icon={<GlobeIcon className="h-3 w-3" />}
                label={websiteHost}
              />
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Painted brush-stroke background, filling whatever box its parent gives it.
 *
 * Three masked layers, sliced from the same photographed watercolour texture and
 * recoloured through `mask-image` (the shape's alpha decides what shows, the brand
 * colour is the actual paint, so one shared set of assets works for every company
 * without shipping one coloured image per company):
 *
 *   - `pincelada-borde-superior.png` / `-inferior.png`, the genuinely torn top and
 *     bottom edge of the original brush stroke, each pinned to a FIXED pixel height at
 *     its own edge of the box — this is what still reads as a hand-painted stroke rather
 *     than a rounded rectangle, however tall the box grows.
 *   - `pincelada.png`, cropped down to the inner band that stays 85%+ opaque top to
 *     bottom (no fade left to expose), inset by a fixed amount from each edge and
 *     stretched to fill everything in between.
 *
 * A single mask stretched to 100% of the box (an earlier version of this component) had
 * to choose between the two: crop tight to the torn edges and a tall block's first/last
 * line lands on the fade (the original bug); crop tight to the solid core instead and
 * the torn-edge look disappears, so it reads as a flat block instead of a brush stroke
 * (what the client flagged next). Splitting fixed-height edges from a stretchy solid
 * middle is what lets both be true regardless of how many lines the box holds — the
 * edges never grow, the middle always fully covers whatever grows between them.
 */
function BrushStroke({ color }: { readonly color: string }) {
  const maskLayer = (src: string): React.CSSProperties => ({
    backgroundColor: color,
    maskImage: `url(${src})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskImage: `url(${src})`,
    WebkitMaskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
  });

  // Sized in Tailwind classes, not a JS constant, because the edge band has to scale
  // down with the smaller mobile type: at the desktop 44px it read clearly as torn paint,
  // but on a phone's much shorter, smaller-text boxes that same fixed height would
  // overflow past the box's own top/bottom (this is an absolutely-positioned overlay, so
  // nothing clips it) and bleed into whatever sits above or below.
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-4 sm:h-11"
        style={maskLayer('/texturas/pincelada-borde-superior.png')}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-4 sm:h-11"
        style={maskLayer('/texturas/pincelada-borde-inferior.png')}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -z-10 top-[10px] bottom-[10px] sm:top-[26px] sm:bottom-[26px]"
        style={maskLayer('/texturas/pincelada.png')}
      />
    </>
  );
}

function ContactItem({
  href,
  color,
  icon,
  label,
  external = false,
}: {
  readonly href: string;
  readonly color: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        {label}
      </a>
    </li>
  );
}
