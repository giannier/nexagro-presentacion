'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeOffIcon,
} from '@/components/ui/icons';
import type { PortfolioItem } from '@/data/companyPortfolio';
import { useVideoPoster } from '@/hooks/useVideoPoster';

/** Cards either side of the centre that stay mounted. Beyond this they are fully hidden
 *  behind the ones in front, so mounting them would cost a decode for nothing. */
const VISIBLE_RANGE = 2;

/** Horizontal shift per step, as a percentage of the card's own width — so the whole
 *  layout scales with the card and needs no measurement of the viewport. */
const STEP_PERCENT = 60;

/** How far the side cards turn away from the viewer. Enough depth to read as a row with
 *  perspective, small enough that a flyer stays legible while it is being dragged past. */
const SIDE_ROTATE_DEG = 26;
const SIDE_SCALE = 0.86;

/** Drag distance that commits to the next card. Below it the gesture is treated as a tap,
 *  which keeps a slightly shaky finger from skipping a flyer. */
const SWIPE_THRESHOLD_PX = 48;

export type PortfolioCarouselHandle = {
  readonly next: () => void;
  readonly previous: () => void;
};

type PortfolioCarouselProps = {
  readonly items: readonly PortfolioItem[];
  readonly label: string;
  readonly color: string;
};

/** Places a card relative to the active one. */
function cardTransform(offset: number): string {
  const clamped = Math.max(-VISIBLE_RANGE, Math.min(VISIBLE_RANGE, offset));
  const shift = offset * STEP_PERCENT;
  const rotate = clamped * -SIDE_ROTATE_DEG;
  const scale = offset === 0 ? 1 : SIDE_SCALE;

  // Centre first (`translate(-50%, -50%)`, since every card is absolutely positioned on
  // the same point), then step sideways, turn and pull back.
  return `translate(-50%, -50%) translateX(${shift}%) rotateY(${rotate}deg) scale(${scale})`;
}

function cardOpacity(offset: number): number {
  const distance = Math.abs(offset);
  if (distance === 0) return 1;
  if (distance === 1) return 1;
  return 0.55;
}

/** What a video card shows when there is no frame to show yet: the brand's own colour,
 *  so it reads as a deliberate placeholder rather than a failed download. */
function VideoPlaceholder({ color, large }: { readonly color: string; readonly large: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `radial-gradient(120% 90% at 30% 20%, ${color}f0 0%, ${color}a6 48%, #0a0d14 100%)`,
      }}
    >
      <span
        className={[
          'flex items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm',
          large ? 'h-20 w-20' : 'h-12 w-12',
        ].join(' ')}
      >
        <PlayIcon className={large ? 'ml-1 h-8 w-8' : 'ml-0.5 h-5 w-5'} />
      </span>
    </div>
  );
}

type SlideProps = {
  readonly item: PortfolioItem;
  readonly offset: number;
  readonly color: string;
  readonly position: number;
  readonly total: number;
  readonly onActivate: () => void;
};

/**
 * One card of the carousel.
 *
 * A gallery slide is only ever a still image. A video slide is a still until it becomes
 * the centre card, and only then does a `<video>` element exist at all — which is what
 * keeps a company's whole video shelf from being downloaded the moment it is opened.
 * The thumbnails the side cards show are captured frames (see `useVideoPoster`).
 */
function Slide({ item, offset, color, position, total, onActivate }: SlideProps) {
  const isActive = offset === 0;
  const isVideo = item.type === 'video';
  const poster = useVideoPoster(item.src, isVideo && Math.abs(offset) <= VISIBLE_RANGE);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video === null) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video === null) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  }, []);

  const showVideo = isVideo && isActive && !failed;

  // A card that was unmuted and then left must not come back unmuted: an unmuted
  // `<video autoPlay>` is exactly what browsers refuse to start without a fresh gesture,
  // so the card would return silently stuck. Every arrival starts muted and from zero.
  useEffect(() => {
    setMuted(true);
    setProgress(0);
  }, [isActive]);

  return (
    <div
      aria-roledescription="diapositiva"
      aria-label={`${position + 1} de ${total}`}
      className="absolute left-1/2 top-1/2 overflow-hidden rounded-[1.6rem] border border-neutral-100 bg-neutral-50 shadow-[0_28px_70px_-24px_rgba(4,5,10,0.4)] motion-safe:transition-[transform,opacity] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        transform: cardTransform(offset),
        opacity: cardOpacity(offset),
        zIndex: 100 - Math.abs(offset),
        // Width drives the frame and `aspect-ratio` derives the height, so the card keeps
        // a 4:5 window at every screen size — the shape most of the flyers actually are —
        // and only sacrifices the ratio on very short screens, where `maxHeight` wins.
        width: 'min(92vw, 38rem)',
        aspectRatio: '4 / 5',
        maxHeight: '76dvh',
      }}
    >
      {item.type === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.name}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain"
        />
      )}

      {isVideo && !showVideo && (
        <>
          {poster === null ? (
            <VideoPlaceholder color={color} large={false} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-contain"
            />
          )}
          {failed && (
            <p className="absolute inset-x-0 bottom-3 text-center text-[0.65rem] font-medium text-white/80">
              No se pudo cargar este video
            </p>
          )}
        </>
      )}

      {showVideo && (
        <>
          <video
            ref={videoRef}
            key={item.src}
            src={item.src}
            poster={poster ?? undefined}
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setProgress(video.duration > 0 ? video.currentTime / video.duration : 0);
            }}
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full bg-neutral-950 object-contain"
          />

          {/* Paused: one large, unmistakable target — sized to itself, so it never
              swallows the control bar underneath it. */}
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={`Reproducir ${item.name}`}
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow-lg backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <PlayIcon className="ml-1 h-8 w-8" />
            </button>
          )}

          {/* A restrained control bar rather than the full native chrome. Present even
              while paused, so the progress and the sound state stay readable — and so
              "unmute" is reachable without starting playback first. */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-neutral-950/75 to-transparent px-3 pb-2.5 pt-8">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? `Pausar ${item.name}` : `Reproducir ${item.name}`}
              className="shrink-0 rounded-full p-1.5 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
            >
              {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>

            <div aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full transition-[width] duration-200 ease-linear"
                style={{ width: `${progress * 100}%`, backgroundColor: color }}
              />
            </div>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? `Activar sonido de ${item.name}` : `Silenciar ${item.name}`}
              className="shrink-0 rounded-full p-1.5 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
            >
              {muted ? <VolumeOffIcon className="h-4 w-4" /> : <VolumeIcon className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}

      {/* A side card is just a shortcut to its own centre position — it never starts
          playing where it stands. A play badge says as much on a video card. */}
      {!isActive && (
        <button
          type="button"
          onClick={onActivate}
          aria-label={`Ver ${item.name}`}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-neutral-900"
        >
          {isVideo && (
            <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950/55 text-white backdrop-blur-sm">
              <PlayIcon className="ml-0.5 h-4 w-4" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * The portfolio carousel: one row of cards with the selected one held flat and forward,
 * its neighbours stepped back and turned away — the shape the reference galleries use,
 * and the one that survives a portrait 9:16 video next to a 4:5 flyer without either
 * being cropped or letterboxed into a sliver.
 *
 * Cards keep their own aspect inside a fixed frame and are never cropped: a flyer is a
 * designed document, and cutting its edges can cut the part that was meant to be read.
 *
 * Driven by arrows, dots, a horizontal swipe, the arrow keys, or voice — the last one
 * through this component's imperative handle, held by `CompanyHud`.
 */
export const PortfolioCarousel = forwardRef<PortfolioCarouselHandle, PortfolioCarouselProps>(
  function PortfolioCarousel({ items, label, color }, ref) {
    const [index, setIndex] = useState(0);
    const dragRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
    /** Set by a drag that went far enough to count, so the tap that ends it is ignored. */
    const swipedRef = useRef(false);

    const count = items.length;
    const last = Math.max(0, count - 1);

    const goTo = useCallback(
      (next: number) => {
        setIndex(Math.max(0, Math.min(last, next)));
      },
      [last],
    );

    const goPrevious = useCallback(() => goTo(index - 1), [goTo, index]);
    const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

    useImperativeHandle(ref, () => ({ next: goNext, previous: goPrevious }));

    // Arrow keys, for a keyboard or a presenter remote pointed at the stand.
    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goPrevious();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          goNext();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
      };
    }, [goNext, goPrevious]);

    if (count === 0) {
      return <p className="px-6 text-center text-sm text-neutral-500">Todavía no hay nada cargado aquí.</p>;
    }

    const first = Math.max(0, index - VISIBLE_RANGE);
    const lastVisible = Math.min(last, index + VISIBLE_RANGE);
    const slides = [];
    for (let item = first; item <= lastVisible; item += 1) slides.push(item);

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          role="group"
          aria-roledescription="carrusel"
          aria-label={label}
          className="relative min-h-0 flex-1 touch-pan-y"
          style={{ perspective: '1500px' }}
          onPointerDown={(event) => {
            dragRef.current = { x: event.clientX, y: event.clientY };
            swipedRef.current = false;
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            dragRef.current = null;
            if (drag === null) return;

            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            // Only a clearly horizontal gesture counts: a vertical drag belongs to
            // whatever is behind the dialog, and a short one is simply a tap.
            if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;

            swipedRef.current = true;
            if (dx < 0) goNext();
            else goPrevious();
          }}
        >
          {slides.map((entry) => {
            const slide = items[entry];
            if (slide === undefined) return null;
            return (
              <Slide
                key={slide.src}
                item={slide}
                offset={entry - index}
                color={color}
                position={entry}
                total={count}
                onActivate={() => {
                  if (swipedRef.current) return;
                  goTo(entry);
                }}
              />
            );
          })}

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                disabled={index === 0}
                aria-label="Anterior"
                className="absolute left-1 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-white/90 p-3 text-neutral-900 shadow-md backdrop-blur-sm transition disabled:opacity-25 hover:bg-white disabled:hover:bg-white/90 sm:left-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={index === last}
                aria-label="Siguiente"
                className="absolute right-1 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-white/90 p-3 text-neutral-900 shadow-md backdrop-blur-sm transition disabled:opacity-25 hover:bg-white disabled:hover:bg-white/90 sm:right-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-6 pb-4 pt-5">
            {items.map((entry, position) => (
              <button
                key={entry.src}
                type="button"
                onClick={() => goTo(position)}
                aria-label={`Ir a ${entry.name}`}
                aria-current={position === index}
                className="h-2 rounded-full transition-all motion-safe:duration-300"
                style={{
                  width: position === index ? '1.5rem' : '0.5rem',
                  backgroundColor: position === index ? color : '#d4d4d4',
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
