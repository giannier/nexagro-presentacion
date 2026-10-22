/**
 * Shared look of the three HUD actions, so an anchor and a button render identically.
 *
 * Phones get a compact tab-bar style (icon above a short label) so all three fit in one
 * row at 360px; from `sm` up they become horizontal pills.
 */
export function hudButtonClassName(variant: 'primary' | 'secondary'): string {
  return [
    'group inline-flex min-w-[6.25rem] flex-col items-center justify-center gap-1.5',
    'rounded-2xl px-3 py-2.5 text-[0.7rem] font-semibold leading-tight no-underline',
    'sm:min-w-0 sm:flex-row sm:gap-2.5 sm:rounded-full sm:px-6 sm:py-3 sm:text-sm',
    'transition-[background-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.97]',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900',
    variant === 'primary'
      ? 'shadow-lg shadow-neutral-900/10 hover:shadow-xl'
      : 'border border-neutral-200 bg-white text-neutral-900 shadow-sm hover:border-neutral-300 hover:bg-neutral-50',
  ].join(' ');
}
