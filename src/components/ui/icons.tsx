import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </BaseIcon>
  );
}

export function QrIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
      <path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h.01M17.5 20.5h3v-3" />
    </BaseIcon>
  );
}

export function FormIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3.5v2h6v-2M8.5 10.5h7M8.5 14h7M8.5 17.5h4" />
    </BaseIcon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <BaseIcon strokeWidth={2} {...props}>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.8 19.9 4.1 13.2 3.5 5.1A1.5 1.5 0 0 1 5 3.5h1.5z" />
    </BaseIcon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <BaseIcon strokeWidth={2} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </BaseIcon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 12h14M13 7l5 5-5 5" />
    </BaseIcon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 12H6M11 7l-5 5 5 5" />
    </BaseIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </BaseIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </BaseIcon>
  );
}

export function PortfolioIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h5l1.5 2h5L16 12h5" />
    </BaseIcon>
  );
}

export function CatalogIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 4h9A1.5 1.5 0 0 1 17 5.5v15l-5-2.6-5 2.6v-15A1.5 1.5 0 0 1 6.5 4z" />
      <path d="M9 9h4" />
    </BaseIcon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </BaseIcon>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </BaseIcon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </BaseIcon>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M4 17l4.5-4.5L12 16l3-2.5 5 4.5" />
    </BaseIcon>
  );
}

/** Play glyph for a video: the triangle is filled, unlike every other icon here, so a
 *  card still reads as "this plays" at thumbnail size. */
export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8.5 5.5l10 6.5-10 6.5z" fill="currentColor" strokeWidth={1.4} />
    </BaseIcon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" strokeWidth={0} />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" strokeWidth={0} />
    </BaseIcon>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.8 7a7 7 0 0 1 0 10" />
    </BaseIcon>
  );
}

export function VolumeOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
      <path d="M15.5 10.5l4 4M19.5 10.5l-4 4" />
    </BaseIcon>
  );
}
