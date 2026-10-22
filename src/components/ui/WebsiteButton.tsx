'use client';

import type { MouseEvent } from 'react';

import { hudButtonClassName } from '@/components/ui/hudButton';
import { ArrowRightIcon, GlobeIcon } from '@/components/ui/icons';
import { useWheel } from '@/context/WheelContext';
import type { Company } from '@/data/companies';
import { companyColor } from '@/data/companyColors';
import { readableTextColor } from '@/lib/color';

type WebsiteButtonProps = {
  readonly company: Company;
  readonly index: number;
};

/**
 * "Ingresar a la web" — the only way into a company website.
 *
 * A real anchor rather than a button: a native `target="_blank"` navigation is never
 * refused by the popup blocker, and it gives Ctrl/Cmd-click and middle-click for free.
 * The click handler only plays the acknowledgement pulse; the browser owns navigation.
 *
 * Filled with the company's own brand colour, with the text colour picked for contrast.
 */
export function WebsiteButton({ company, index }: WebsiteButtonProps) {
  const { isTransitioning, confirmSelection } = useWheel();
  const background = companyColor(company.slug);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modifier and middle clicks have their own browser semantics (background tab,
    // new window). Animating over them would misrepresent what happened.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    confirmSelection(index);
  };

  return (
    <a
      href={company.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-disabled={isTransitioning}
      aria-label={`Ingresar a la web de ${company.name}, se abre en una pestaña nueva`}
      style={{ backgroundColor: background, color: readableTextColor(background) }}
      className={[hudButtonClassName('primary'), isTransitioning ? 'pointer-events-none' : ''].join(' ')}
    >
      <GlobeIcon className="h-5 w-5 shrink-0" />
      <span>Ingresar a la web</span>
      <ArrowRightIcon className="hidden h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 sm:block" />
    </a>
  );
}
