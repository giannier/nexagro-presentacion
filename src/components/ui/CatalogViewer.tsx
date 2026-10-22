'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import type { PortfolioItem } from '@/data/companyPortfolio';

type CatalogViewerProps = {
  readonly title: string;
  readonly items: readonly PortfolioItem[];
  readonly open: boolean;
  readonly onClose: () => void;
};

/** Imperative handle so a voice "siguiente"/"anterior" heard while this dialog is open
 *  can advance it — `CompanyHud` holds the ref, since this component's own `index` state
 *  is otherwise fully internal and there is no other way in from outside. */
export type CatalogViewerHandle = {
  readonly next: () => void;
  readonly previous: () => void;
};

/**
 * Full-screen viewer for a company's PDF documents, opened by the "Catálogo" HUD button.
 *
 * Not a grid of thumbnails that hands the visitor off to a new tab — the whole point is
 * for someone browsing the stand to read the catalogue itself, large, without losing the
 * wheel underneath. A native `<dialog>` still owns the top layer, focus trap and
 * Escape-to-close exactly like the shared `<Modal>`, but sized to the full viewport
 * instead of a small centred card, and a PDF renders through an `<iframe>`, so
 * "Regresar" is always the one way back, never a second browser tab.
 *
 * Flyers and videos no longer come through here: they are browsed in `<PortfolioDialog>`,
 * whose carousel is built for stepping through many pages. A document is read one at a
 * time at full size instead, which is why the two are separate components.
 */
export const CatalogViewer = forwardRef<CatalogViewerHandle, CatalogViewerProps>(function CatalogViewer(
  { title, items, open, onClose },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  const goNext = () => setIndex((value) => (items.length === 0 ? 0 : (value + 1) % items.length));
  const goPrevious = () => setIndex((value) => (items.length === 0 ? 0 : (value - 1 + items.length) % items.length));

  useImperativeHandle(ref, () => ({ next: goNext, previous: goPrevious }));

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

  // Always reopen on the first item, whichever one or which list was showing last time.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open, items]);

  const current = items[index];
  const hasMultiple = items.length > 1;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-neutral-950 p-0 backdrop:bg-neutral-950"
    >
      {open && (
        <div className="relative flex h-full w-full flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 px-3 py-3 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className={[
                'inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5',
                'text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
              ].join(' ')}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Regresar
            </button>

            {hasMultiple && (
              <span className="text-sm tracking-wide text-white/70">
                {index + 1} / {items.length}
              </span>
            )}
          </header>

          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {current === undefined ? (
              <p className="px-6 text-center text-sm text-white/70">Todavía no hay nada cargado aquí.</p>
            ) : current.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.src}
                src={current.src}
                alt={`${title} — ${current.name}`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <iframe key={current.src} src={current.src} title={current.name} className="h-full w-full" />
            )}

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrevious}
                  aria-label="Anterior"
                  className={[
                    'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3',
                    'text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                  ].join(' ')}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Siguiente"
                  className={[
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3',
                    'text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                  ].join(' ')}
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {hasMultiple && (
            <div className="flex shrink-0 items-center justify-center gap-2 pb-5 pt-2">
              {items.map((item, itemIndex) => (
                <button
                  key={item.src}
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Ir al documento ${itemIndex + 1}`}
                  aria-current={itemIndex === index}
                  className={[
                    'h-2 w-2 rounded-full transition-colors',
                    itemIndex === index ? 'bg-white' : 'bg-white/30 hover:bg-white/50',
                  ].join(' ')}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
});
