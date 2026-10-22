const INK = '#0b0d12';
const WHITE = '#ffffff';

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Picks whichever of white or ink text reads better on a brand colour.
 *
 * Needed because the brand palette spans both extremes: white text works on the deep
 * blues but disappears on the yellows of Rekuperat or Escuela Capacita.
 */
export function readableTextColor(background: string): string {
  const bg = luminance(background);
  return contrast(bg, luminance(WHITE)) >= contrast(bg, luminance(INK)) ? WHITE : INK;
}
