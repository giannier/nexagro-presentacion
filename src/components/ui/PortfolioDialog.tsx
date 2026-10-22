'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ImageIcon, PlayIcon } from '@/components/ui/icons';
import { PortfolioCarousel, type PortfolioCarouselHandle } from '@/components/ui/PortfolioCarousel';
import type { PortfolioItem } from '@/data/companyPortfolio';

/** Which shelf of the portfolio is open. `null` is the picker the visitor lands on
 *  first, before they have chosen between flyers and videos. */
type Shelf = 'flyers' | 'videos';

type PortfolioDialogProps = {
  readonly companyName: string;
  readonly flyers: readonly PortfolioItem[];
  readonly videos: readonly PortfolioItem[];
  readonly color: string;
  readonly open: boolean;
  readonly onClose: () => void;
};

/** Same shape as `CatalogViewerHandle`, so voice "siguiente"/"anterior" keeps working
 *  the way it did when the portfolio was a single straight list of images. */
export type PortfolioDialogHandle = {
  readonly next: () => void;
  readonly previous: () => void;
};

type ShelfCardProps = {
  readonly title: string;
  readonly count: number;
  readonly unitSingular: string;
  readonly unitPlural: string;
  readonly color: string;
  readonly icon: 'flyers' | 'videos';
  readonly onOpen: () => void;
};

/**
 * One of the two cards the portfolio opens on. A disabled card is the honest state for a
 * company that has not uploaded a video yet: the visitor sees the category exists and is
 * simply empty, instead of tapping through to a blank gallery.
 */
function ShelfCard({ title, count, unitSingular, unitPlural, color, icon, onOpen }: ShelfCardProps) {
  const empty = count === 0;
  const subtitle = empty ? 'Sin contenido por ahora' : `${count} ${count === 1 ? unitSingular : unitPlural}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={empty}
      aria-label={empty ? `${title}: todavía no hay contenido` : `${title}, ${subtitle}`}
      className={[
        'group relative flex min-h-[13rem] flex-col items-start gap-5 overflow-hidden rounded-3xl border p-6 text-left transition sm:p-7',
        empty
          ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-60'
          : 'border-neutral-100 bg-white shadow-sm hover:-translate-y-1 hover:border-neutral-200 hover:shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
      ].join(' ')}
    >
      {/* The brand's own colour, as a hairline across the top of the card. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 transition-opacity"
        style={{ backgroundColor: color, opacity: empty ? 0.35 : 1 }}
      />

      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform motion-safe:group-hover:scale-105"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {icon === 'flyers' ? <ImageIcon className="h-7 w-7" /> : <PlayIcon className="ml-0.5 h-6 w-6" />}
      </span>

      <span className="mt-auto">
        <span className="block text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">{title}</span>
        <span className="mt-1 block text-sm text-neutral-500">{subtitle}</span>
      </span>

      {!empty && (
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color }}
          aria-hidden="true"
        >
          Ver galería
          <ArrowRightIcon className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" />
        </span>
      )}
    </button>
  );
}

/**
 * The "Portafolio" HUD button's destination: first a short picker between the company's
 * flyers and its videos, then the carousel for whichever was chosen.
 *
 * Nothing here leaves the page. The reference media this is modelled on — a stand
 * visitor looking at what a business has produced — only works if the gallery overlays
 * the wheel and "Regresar" always brings them straight back, so the whole thing is one
 * full-screen native `<dialog>` and never a new tab or a download.
 *
 * Kept deliberately light and white: the flyers and videos are the loud part, and the
 * brand's colour is used only as an accent (the hairline, the active dot, the player).
 */
export const PortfolioDialog = forwardRef<PortfolioDialogHandle, PortfolioDialogProps>(function PortfolioDialog(
  { companyName, flyers, videos, color, open, onClose },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const carouselRef = useRef<PortfolioCarouselHandle>(null);
  const [shelf, setShelf] = useState<Shelf | null>(null);

  // Read inside the `cancel` handler below, which is bound once and must still see the
  // shelf the visitor is actually on.
  const shelfRef = useRef<Shelf | null>(null);
  useEffect(() => {
    shelfRef.current = shelf;
  }, [shelf]);

  useImperativeHandle(ref, () => ({
    next: () => carouselRef.current?.next(),
    previous: () => carouselRef.current?.previous(),
  }));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('close', onClose);
    };
  }, [onClose]);

  // Escape steps back to the picker before it closes the dialog: inside a gallery it is
  // the most natural "go back", and the picker is the only screen where closing is what
  // the key is really being asked for.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const onCancel = (event: Event) => {
      if (shelfRef.current === null) return;
      event.preventDefault();
      setShelf(null);
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
    };
  }, []);

  // Every visit starts on the picker, whichever shelf was being browsed last time.
  useEffect(() => {
    if (open) setShelf(null);
  }, [open]);

  const heading =
    shelf === 'flyers' ? 'Flyers' : shelf === 'videos' ? 'Videos' : `Portafolio de ${companyName}`;
  const items = shelf === 'flyers' ? flyers : shelf === 'videos' ? videos : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Portafolio de ${companyName}`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 backdrop:bg-neutral-950/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="relative flex h-full w-full flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3.5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {shelf !== null && (
                <button
                  type="button"
                  onClick={() => setShelf(null)}
                  className={[
                    'inline-flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 px-3.5 py-2',
                    'text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
                  ].join(' ')}
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Regresar</span>
                </button>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
                  {heading}
                </h2>
                {shelf === null && (
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    Elegí una categoría para ver el contenido
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          {shelf === null ? (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-4 py-8 sm:px-8">
              <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 sm:gap-6">
                <ShelfCard
                  title="Flyers"
                  count={flyers.length}
                  unitSingular="diseño"
                  unitPlural="diseños"
                  color={color}
                  icon="flyers"
                  onOpen={() => setShelf('flyers')}
                />

                <ShelfCard
                  title="Videos"
                  count={videos.length}
                  unitSingular="video"
                  unitPlural="videos"
                  color={color}
                  icon="videos"
                  onOpen={() => setShelf('videos')}
                />
              </div>
            </div>
          ) : (
            // `key` remounts the carousel per shelf, so switching from flyers to videos
            // always starts back at the first card instead of at a stale position.
            <PortfolioCarousel key={shelf} ref={carouselRef} items={items} label={heading} color={color} />
          )}
        </div>
      )}
    </dialog>
  );
});
