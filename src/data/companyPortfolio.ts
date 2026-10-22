/**
 * Portfolio items per company, keyed by slug (files under `public/portafolio/<slug>/`).
 * Maintained by hand. Images and videos feed the Portafolio button; PDFs would feed Catálogo
 * (NEXAGRO has none, so that button stays hidden).
 */

export type PortfolioItem = {
  readonly type: 'image' | 'pdf' | 'video';
  readonly src: string;
  readonly name: string;
};

export const COMPANY_PORTFOLIO: Readonly<Record<string, readonly PortfolioItem[]>> = {
  nexagro: [
    { type: 'image', src: '/portafolio/nexagro/agricultores-recomiendan-nexagro.webp', name: 'Agricultores que recomiendan Nexagro' },
    { type: 'image', src: '/portafolio/nexagro/agronoma-entre-cultivos-cosecha-fresca.webp', name: 'Agrónoma entre cultivos y cosecha fresca' },
    { type: 'image', src: '/portafolio/nexagro/capacitacion-nexagro-huerto-palta.webp', name: 'Capacitación Nexagro en el huerto de palta' },
    { type: 'image', src: '/portafolio/nexagro/nutricion-fortalece-tu-cultivo.webp', name: 'Nutrición que fortalece tu cultivo' },
    { type: 'image', src: '/portafolio/nexagro/productos-peruanos-calidad-mundial.webp', name: 'Productos peruanos, calidad mundial' },
    { type: 'image', src: '/portafolio/nexagro/soluciones-cosecha-excepcional.webp', name: 'Soluciones para una cosecha excepcional' },
    { type: 'video', src: '/portafolio/nexagro/video-nexagro-export.mp4', name: 'Video IA Nexagro Export' },
  ],
};

export function portfolioFor(slug: string): readonly PortfolioItem[] {
  return COMPANY_PORTFOLIO[slug] ?? [];
}
