import type { SVGProps } from 'react';

import type { SocialNetwork } from '@/data/companySocials';

type SocialIconProps = SVGProps<SVGSVGElement> & { readonly network: SocialNetwork };

/**
 * Simplified single-colour network glyphs, drawn in `currentColor`.
 * Kept geometric on purpose: recognisable at button size, no icon font to load.
 */
export function SocialIcon({ network, ...props }: SocialIconProps) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, ...props } as const;

  switch (network) {
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common} fill="currentColor">
          <path d="M16.7 5.6A4.4 4.4 0 0 1 15.6 3h-3.2v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .6 0 .8.1V9.6a5.9 5.9 0 1 0 5 5.8V9.1a7.4 7.4 0 0 0 4.4 1.4V7.3a4.4 4.4 0 0 1-3.3-1.7z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15.1V8.9l5.2 3.1L10 15.1z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common} fill="currentColor">
          <path d="M5.4 8.6H2.3V21h3.1V8.6zM3.9 3a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM21.7 13.9c0-3.4-1.8-5.5-4.6-5.5-1.6 0-2.7.9-3.1 1.6V8.6H11V21h3.1v-6.5c0-1.7.8-2.8 2.2-2.8 1.3 0 2.2.9 2.2 2.8V21h3.2v-7.1z" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M4 4l16 16M20 4L4 20" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round">
          <path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3z" />
          <path
            d="M9 8.2c-.4 0-.9.5-.9 1.3 0 2.7 3.6 6.3 6.3 6.3.8 0 1.3-.5 1.3-.9v-.9l-1.8-.9-.9.9c-1.1-.4-2.2-1.5-2.6-2.6l.9-.9-.9-1.8H9z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
  }
}
