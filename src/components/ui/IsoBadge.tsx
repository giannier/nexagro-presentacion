'use client';

import { useWheel } from '@/context/WheelContext';
import { COMPANIES } from '@/data/companies';
import { isoBadgeFor } from '@/data/companyIsoBadges';

/**
 * Certification stamp for the focused company, floating on the white stage beside the
 * 3D logo.
 *
 * Placement: pinned to the top-LEFT of the canvas box, above the band the logo can ever
 * reach and clear of the showcase panel's diagonal edge (which only bulges into the
 * canvas around mid-height). `<CameraRig>` frames every logo inside 62% of the panel
 * height (or 95% of the width when width binds first), which always leaves that corner
 * free — so the stamp reads as sitting next to the mark without any risk of covering
 * it, whatever the company's logo aspect ratio. The top offset keeps a pixel floor
 * (`clamp`) so it stays clear of the chrome that shares the top edge on short screens.
 * Sizing is viewport-relative too, so the stamp stays proportional from a phone in
 * landscape (where the canvas is short) to a desktop monitor.
 *
 * Interaction: `pointer-events-none`. The drag/tap capture layer sits above this corner,
 * and the stamp must never eat a swipe meant for the wheel. The float and coin flip are
 * plain CSS animations (see `globals.css`) — compositor-only, so the render loop does
 * not pay for them.
 */
export function IsoBadge() {
  const { activeIndex } = useWheel();
  const company = COMPANIES[activeIndex];

  if (company === undefined) return null;

  const badge = isoBadgeFor(company.slug);
  if (badge === undefined) return null;

  return (
    <div className="pointer-events-none absolute left-[6%] top-[clamp(3.5rem,7%,4.5rem)] size-[clamp(5.25rem,9.5vw,8.75rem)] [perspective:800px] sm:left-[7%]">
      <div className="iso-badge-float h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badge}
          alt={`Sello de certificación ISO 9001 de ${company.name}`}
          className="iso-badge-coin h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)]"
        />
      </div>
    </div>
  );
}
