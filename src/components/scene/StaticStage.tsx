'use client';

import { useEffect, useState } from 'react';

import { CompanyShowcase } from '@/components/showcase/CompanyShowcase';
import { CompanyHud } from '@/components/ui/CompanyHud';
import { IsoBadge } from '@/components/ui/IsoBadge';
import { WheelProvider } from '@/context/WheelContext';
import { COMPANIES } from '@/data/companies';
import { logoAspectRatio } from '@/data/logoAspectRatios';

/** Time between the starts of two automatic coin spins (a spin itself lasts 1.5 s). */
const COIN_REPLAY_INTERVAL_MS = 10_000;

/**
 * Single-company stage: the same split layout as the 3D experience, but the logo is a
 * plain `<img>` of the vector SVG instead of a WebGL texture, so it stays razor sharp at
 * any pixel ratio and the page never loads three.js. Used by `page.tsx` only while there
 * is exactly one company; with more, the wheel (`SceneCanvas`) takes over again.
 */
export function StaticStage() {
  const company = COMPANIES[0];
  // Bumped by a click on the logo, and by the timer below, to replay the coin spin.
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      // A hidden tab would only queue spins nobody sees.
      if (!document.hidden) setPlays((count) => count + 1);
    }, COIN_REPLAY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  if (company === undefined) return null;

  const aspect = logoAspectRatio(company.slug);

  return (
    <WheelProvider>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-white landscape:flex-row">
        <CompanyShowcase />

        <div className="relative min-h-0 flex-1">
          {/* Same free area the canvas used: it stops above the HUD chrome. */}
          <div className="absolute inset-x-0 bottom-40 top-0 flex items-center justify-center px-[5%] landscape:bottom-32 [@media(max-height:700px)]:bottom-[13.5rem] landscape:[@media(max-height:700px)]:bottom-32">
            {/* A button so the coin spin can be replayed by click, tap or keyboard. Remounting
                the inner nodes (key) restarts the CSS animations. */}
            <button
              type="button"
              onClick={() => setPlays((count) => count + 1)}
              aria-label="Reproducir animación del logo"
              className="w-[90%] max-w-[1100px] max-h-[85%] cursor-pointer select-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
            >
              <div
                key={plays}
                className={plays === 0 ? 'logo-coin-pop' : 'logo-coin-pop logo-coin-pop--again'}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/logos/${company.slug}.svg`}
                  alt={company.name}
                  decoding="async"
                  draggable={false}
                  style={{ aspectRatio: aspect }}
                  className={`${plays === 0 ? 'logo-coin-spin' : 'logo-coin-spin logo-coin-spin--again'} block h-auto max-h-full w-full select-none object-contain`}
                />
              </div>
            </button>
            <IsoBadge />
          </div>

          <CompanyHud />
        </div>
      </div>
    </WheelProvider>
  );
}

export default StaticStage;
