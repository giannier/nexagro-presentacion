'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { CloseIcon } from '@/components/ui/icons';

type ModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
};

/**
 * Thin wrapper over the native `<dialog>` element.
 *
 * `showModal()` gives, for free and correctly, what hand-rolled modals usually get
 * wrong: the top layer above the WebGL canvas, focus moved inside and trapped, Escape to
 * close, and everything behind made inert — which is also what stops the wheel's capture
 * layer from receiving drags while a dialog is open.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // `close` fires for Escape as well as for programmatic closes, so this keeps React
  // state in sync with the element whichever way the dialog was dismissed.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('close', onClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      // The panel fills the dialog box, so a click whose target is the dialog itself
      // can only have landed on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={[
        'm-auto max-h-[92dvh] w-[min(94vw,34rem)] overflow-hidden rounded-3xl bg-white p-0',
        'text-neutral-900 shadow-2xl',
        'backdrop:bg-neutral-950/40 backdrop:backdrop-blur-sm',
      ].join(' ')}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-4 pt-5">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description !== undefined && (
                <p id={descriptionId} className="mt-1 text-sm text-neutral-500">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={[
                'shrink-0 rounded-full p-2 text-neutral-500 transition-colors',
                'hover:bg-neutral-100 hover:text-neutral-900',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
              ].join(' ')}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          <div className="overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
