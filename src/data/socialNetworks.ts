import type { SocialNetwork } from '@/data/companySocials';

export type SocialNetworkMeta = {
  readonly label: string;
  /** Call to action shown on the follow button. */
  readonly action: string;
  /** Button fill. Chosen to keep white text readable, so not always the logo hex. */
  readonly color: string;
};

export const SOCIAL_NETWORKS: Readonly<Record<SocialNetwork, SocialNetworkMeta>> = {
  instagram: { label: 'Instagram', action: 'Seguir en Instagram', color: '#d62976' },
  facebook: { label: 'Facebook', action: 'Seguir en Facebook', color: '#1877f2' },
  tiktok: { label: 'TikTok', action: 'Seguir en TikTok', color: '#111111' },
  youtube: { label: 'YouTube', action: 'Suscribirse en YouTube', color: '#e00000' },
  linkedin: { label: 'LinkedIn', action: 'Seguir en LinkedIn', color: '#0a66c2' },
  x: { label: 'X', action: 'Seguir en X', color: '#111111' },
  whatsapp: { label: 'WhatsApp', action: 'Escribir por WhatsApp', color: '#128c7e' },
};
