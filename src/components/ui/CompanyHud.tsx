'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CatalogViewer, type CatalogViewerHandle } from '@/components/ui/CatalogViewer';
import { ContactFormDialog } from '@/components/ui/ContactFormDialog';
import { hudButtonClassName } from '@/components/ui/hudButton';
import { CatalogIcon, FormIcon, MicIcon, PortfolioIcon, QrIcon } from '@/components/ui/icons';
import { PortfolioDialog, type PortfolioDialogHandle } from '@/components/ui/PortfolioDialog';
import { QrDialog } from '@/components/ui/QrDialog';
import { QuickRegisterBanner } from '@/components/ui/QuickRegisterBanner';
import { WebsiteButton } from '@/components/ui/WebsiteButton';
import { useWheel } from '@/context/WheelContext';
import { COMPANIES, COMPANY_COUNT } from '@/data/companies';
import { companyColor } from '@/data/companyColors';
import { portfolioFor } from '@/data/companyPortfolio';
import { legalNameFor, rucFor } from '@/data/companyRuc';
import { useVoiceControl } from '@/hooks/useVoiceControl';
import {
  HINT_FADE_DURATION,
  HUD_DIM_DURATION,
  HUD_DIM_OPACITY,
  HUD_RESTORE_DURATION,
} from '@/lib/constants';
import type { VoiceCommand } from '@/lib/voiceIntent';

type OpenDialog = 'qr' | 'form' | 'portfolio' | 'catalog' | null;

/** Which dialog a spoken "abrir portafolio/catálogo de <empresa>" should open once the
 *  wheel finishes turning to that company — `null` while nothing is pending. */
type PendingDialog = { readonly index: number; readonly dialog: 'portfolio' | 'catalog' } | null;

const VOICE_TOAST_DURATION_MS = 2500;

/**
 * Chrome over the wheel panel: the active company, the position counter and its
 * actions.
 *
 *   "Ingresar a la web"  -> company website in a new tab
 *   "QR de información"  -> QR code to the company's social links page
 *   "Formulario"         -> networking contact form
 *   "Portafolio"         -> flyers and videos from public/portafolio/<slug>, opened on a
 *                           picker between the two, only shown for a company that has at
 *                           least one of them
 *   "Catálogo"           -> PDFs from the same folder, split into its own button so a
 *                           product catalogue does not get lost among flyer photos
 *   "registrar cliente"  -> (voice only) opens `<QuickRegisterBanner>`, which listens to
 *                           the live conversation and auto-saves once it has heard a
 *                           name, phone and rubro — no tap, unlike "Formulario"
 *
 * Also listens continuously for voice commands (see `useVoiceControl/parseVoiceCommand`)
 * so the same actions work by saying, e.g., "mostrar ssoma" or "abrir catálogo de
 * yanayacu clean" — switching companies first if the one named is not the one on screen,
 * then opening the dialog once the wheel actually gets there.
 *
 * Re-renders only when `activeIndex`, `hasInteracted` or `isTransitioning` change —
 * never per frame. The wrapper is `pointer-events-none` so drags pass straight through
 * to the capture layer underneath; only the buttons opt back in.
 */
export function CompanyHud() {
  const { activeIndex, hasInteracted, isTransitioning, jumpToIndex, nudge } = useWheel();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [pendingDialog, setPendingDialog] = useState<PendingDialog>(null);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const [quickRegisterActive, setQuickRegisterActive] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portfolioViewerRef = useRef<PortfolioDialogHandle>(null);
  const catalogViewerRef = useRef<CatalogViewerHandle>(null);

  const company = COMPANIES[activeIndex];
  const closeDialog = useCallback(() => setOpenDialog(null), []);

  const showVoiceToast = useCallback((text: string) => {
    setVoiceToast(text);
    if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setVoiceToast(null), VOICE_TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Once the wheel settles on the company a spoken "abrir portafolio/catálogo de X"
  // asked for, open that dialog — reactive rather than timed, so it fires exactly when
  // `activeIndex` actually gets there regardless of how long the snap animation takes.
  useEffect(() => {
    if (pendingDialog !== null && activeIndex === pendingDialog.index) {
      setOpenDialog(pendingDialog.dialog);
      setPendingDialog(null);
    }
  }, [activeIndex, pendingDialog]);

  /**
   * With a dialog already open, voice is deliberately deaf to nearly everything —
   * someone reading a catalogue out loud to a visitor should not have a stray "quantuk"
   * in their sentence jump the wheel out from under them. "Cerrar" always gets through;
   * inside the portfolio/catalog viewer specifically, "siguiente"/"anterior" do too, so
   * a hands-free "next" while showing a flyer actually flips the image.
   */
  const handleVoiceCommand = useCallback(
    (command: VoiceCommand) => {
      if (openDialog !== null || quickRegisterActive) {
        if (command.type === 'close') {
          closeDialog();
        } else if (openDialog === 'portfolio' || openDialog === 'catalog') {
          const viewer = openDialog === 'portfolio' ? portfolioViewerRef.current : catalogViewerRef.current;
          if (command.type === 'next') viewer?.next();
          if (command.type === 'previous') viewer?.previous();
        }
        return;
      }
      if (company === undefined) return;

      switch (command.type) {
        case 'select-company': {
          const index = COMPANIES.findIndex((candidate) => candidate.slug === command.company.slug);
          if (index !== -1) jumpToIndex(index);
          showVoiceToast(command.company.name);
          return;
        }
        case 'open-portfolio':
        case 'open-catalog': {
          const target = command.company ?? company;
          const index = COMPANIES.findIndex((candidate) => candidate.slug === target.slug);
          const dialog = command.type === 'open-portfolio' ? 'portfolio' : 'catalog';
          if (index === activeIndex) {
            setOpenDialog(dialog);
          } else if (index !== -1) {
            jumpToIndex(index);
            setPendingDialog({ index, dialog });
          }
          showVoiceToast(target.name);
          return;
        }
        case 'open-qr':
          setOpenDialog('qr');
          return;
        case 'open-form':
          setOpenDialog('form');
          return;
        case 'quick-register':
          setQuickRegisterActive(true);
          return;
        case 'open-website':
          // Best-effort: a browser can refuse a `window.open` that was not triggered by
          // a direct tap, which a speech-recognition callback never is. When that
          // happens the visitor still has "Ingresar a la web" to tap themselves.
          if (company.url === '') return;
          window.open(company.url, '_blank', 'noopener,noreferrer');
          return;
        case 'next':
          nudge(1);
          return;
        case 'previous':
          nudge(-1);
          return;
        case 'close':
          return;
        case 'none':
          return;
      }
    },
    [openDialog, quickRegisterActive, closeDialog, company, activeIndex, jumpToIndex, nudge, showVoiceToast],
  );

  // Paused (microphone fully released) while either the contact form's own recorder or
  // the quick-register banner needs the microphone to itself — every other dialog just
  // narrows voice down to "cerrar" above. With a single company the wheel commands
  // ("siguiente", "anterior", company names) are harmless no-ops.
  const voice = useVoiceControl(openDialog !== 'form' && !quickRegisterActive, handleVoiceCommand);

  // The swipe hint retires permanently after the first interaction.
  useEffect(() => {
    const element = hintRef.current;
    if (element === null || !hasInteracted) return;

    const tween = gsap.to(element, {
      opacity: 0,
      duration: HINT_FADE_DURATION,
      ease: 'power2.out',
      overwrite: true,
    });

    return () => {
      tween.kill();
    };
  }, [hasInteracted]);

  // Step the chrome back while the pulse plays, then bring it straight back. Both
  // directions run from one effect so the HUD can never be stranded half-faded.
  useEffect(() => {
    const element = rootRef.current;
    if (element === null) return;

    const tween = gsap.to(element, {
      opacity: isTransitioning ? HUD_DIM_OPACITY : 1,
      duration: isTransitioning ? HUD_DIM_DURATION : HUD_RESTORE_DURATION,
      ease: isTransitioning ? 'power2.in' : 'power2.out',
      overwrite: true,
    });

    return () => {
      tween.kill();
    };
  }, [isTransitioning]);

  if (company === undefined) return null;

  const color = companyColor(company.slug);
  const ruc = rucFor(company.slug);
  const legalName = legalNameFor(company.slug);
  const portfolioItems = portfolioFor(company.slug);
  const flyers = portfolioItems.filter((item) => item.type === 'image');
  const videos = portfolioItems.filter((item) => item.type === 'video');
  const catalogItems = portfolioItems.filter((item) => item.type === 'pdf');
  const hasPortfolio = flyers.length > 0 || videos.length > 0;

  return (
    <>
      <div ref={rootRef} className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
        {quickRegisterActive && (
          <QuickRegisterBanner interestCompany={company.name} onDone={() => setQuickRegisterActive(false)} />
        )}

        {/* Quiet by design: a status pill, not a prompt asking for attention — this
            experience is meant to work whether or not anyone notices it is listening.
            Hidden during quick-register: that banner already shows its own mic state. */}
        {!voice.supported && (
          <div className="absolute right-3 top-3 sm:right-6 sm:top-6">
            <div className="flex items-center gap-1.5 rounded-full bg-neutral-900/40 px-3 py-1.5 text-[0.65rem] font-medium text-white/80 backdrop-blur-sm">
              <MicIcon className="h-3.5 w-3.5" />
              Voz no disponible en este navegador
            </div>
          </div>
        )}
        {voice.supported && !quickRegisterActive && (
          <div className="absolute right-3 top-3 sm:right-6 sm:top-6">
            <div
              className={[
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.65rem] font-medium backdrop-blur-sm transition-colors',
                voice.permissionDenied
                  ? 'bg-amber-100/90 text-amber-800'
                  : voice.listening
                    ? 'bg-neutral-900/80 text-white'
                    : 'bg-neutral-900/40 text-white/70',
              ].join(' ')}
            >
              <MicIcon className={`h-3.5 w-3.5 ${voice.listening ? 'animate-pulse' : ''}`} />
              {voice.permissionDenied ? 'Permite el micrófono' : voice.listening ? 'Voz activa' : 'Voz'}
            </div>
          </div>
        )}

        {voiceToast !== null && (
          <div aria-live="polite" className="absolute left-1/2 top-3 -translate-x-1/2 sm:top-6">
            <div className="rounded-full bg-neutral-900/85 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
              🎙 {voiceToast}
            </div>
          </div>
        )}

        {/* On a very short screen (a phone on its side) the chrome tightens up so it
            never grows into the space the logo needs. */}
        <footer className="px-4 pb-6 sm:px-8 sm:pb-8 [@media(max-height:450px)]:pb-3">
          <div className="mb-5 flex flex-col items-center text-center [@media(max-height:450px)]:mb-2">
            {COMPANY_COUNT > 1 && (
            <p
              ref={hintRef}
              aria-hidden="true"
              className="mb-3 text-[0.6rem] uppercase tracking-[0.3em] text-neutral-400 [@media(max-height:450px)]:hidden"
            >
              Desliza para explorar
            </p>
            )}

            {/*
              The 3D logo directly above already says the company's name — repeating it
              here as text was pure redundancy. Kept for screen readers only: the visual
              identity a sighted visitor gets from the mark and the showcase panel has no
              equivalent for someone who cannot see it.
            */}
            <p aria-live="polite" className="sr-only">
              {company.name}
            </p>

            {COMPANY_COUNT > 1 ? (
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-10 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[0.65rem] tracking-[0.3em] text-neutral-400">
                  {String(activeIndex + 1).padStart(2, '0')} / {COMPANY_COUNT}
                </span>
                <span className="h-[2px] w-10 rounded-full" style={{ backgroundColor: color }} />
              </div>
            ) : (
              <span className="h-[2px] w-16 rounded-full" style={{ backgroundColor: color }} />
            )}

            {/* Only shown for a company this table actually covers — the client's own
                SUNAT lookup, not something scraped or guessed for the rest. */}
            {ruc !== undefined && (
              <p className="mt-2 text-sm font-semibold tracking-[0.1em]" style={{ color }}>
                RUC {ruc}
              </p>
            )}
            {legalName !== undefined && (
              <p className="mt-1 text-[0.65rem] tracking-[0.12em] text-neutral-500">{legalName}</p>
            )}
          </div>

          <nav
            aria-label={`Acciones de ${company.name}`}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          >
            {company.url !== '' && (
              <div className="pointer-events-auto">
                <WebsiteButton company={company} index={activeIndex} />
              </div>
            )}

            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => setOpenDialog('qr')}
                aria-haspopup="dialog"
                className={hudButtonClassName('secondary')}
              >
                <QrIcon className="h-5 w-5 shrink-0" />
                <span>QR de información</span>
              </button>
            </div>

            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => setOpenDialog('form')}
                aria-haspopup="dialog"
                className={hudButtonClassName('secondary')}
              >
                <FormIcon className="h-5 w-5 shrink-0" />
                <span>Formulario</span>
              </button>
            </div>

            {hasPortfolio && (
              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setOpenDialog('portfolio')}
                  aria-haspopup="dialog"
                  className={hudButtonClassName('secondary')}
                >
                  <PortfolioIcon className="h-5 w-5 shrink-0" />
                  <span>Portafolio</span>
                </button>
              </div>
            )}

            {catalogItems.length > 0 && (
              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setOpenDialog('catalog')}
                  aria-haspopup="dialog"
                  className={hudButtonClassName('secondary')}
                >
                  <CatalogIcon className="h-5 w-5 shrink-0" />
                  <span>Catálogo</span>
                </button>
              </div>
            )}
          </nav>
        </footer>
      </div>

      <QrDialog company={company} open={openDialog === 'qr'} onClose={closeDialog} />
      <ContactFormDialog company={company} open={openDialog === 'form'} onClose={closeDialog} />
      <PortfolioDialog
        ref={portfolioViewerRef}
        companyName={company.name}
        flyers={flyers}
        videos={videos}
        color={color}
        open={openDialog === 'portfolio'}
        onClose={closeDialog}
      />
      <CatalogViewer
        ref={catalogViewerRef}
        title={`Catálogo de ${company.name}`}
        items={catalogItems}
        open={openDialog === 'catalog'}
        onClose={closeDialog}
      />
    </>
  );
}

export default CompanyHud;
