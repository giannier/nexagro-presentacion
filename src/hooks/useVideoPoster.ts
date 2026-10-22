'use client';

import { useEffect, useState } from 'react';

/**
 * First-frame thumbnails for portfolio videos.
 *
 * A `<video>` with `preload="metadata"` does not reliably paint anything before it
 * plays — Chrome leaves the box empty, so a wall of video cards would read as a row of
 * blank rectangles until each one was started. There is no ffmpeg step in this build
 * (the deployment has no binaries for it), so the frame is grabbed in the browser
 * instead: pull the first frame off a hidden `<video>`, paint it to a canvas and keep
 * the result as a data URL.
 *
 * That data URL is a real image, so it behaves like any other thumbnail: it costs one
 * decode instead of a video pipeline, and the carousel can show a card before any
 * playback starts.
 *
 * The whole video is never downloaded for this — the browser fetches just enough of the
 * range to decode the first frame, and only for the handful of cards actually on stage.
 */

/** Captured thumbnails, keyed by video URL: the same video appears on stage more than
 *  once as the carousel moves, and it must be captured exactly once. */
const posters = new Map<string, string>();

/** In-flight captures, so two cards asking for the same video share one download. */
const inFlight = new Map<string, Promise<string | null>>();

/** A video that has not produced a frame by now is skipped rather than left pending —
 *  a slow or unreadable file must not hold a card hostage forever. */
const CAPTURE_TIMEOUT_MS = 8000;

/** Wide enough for the largest card on a 3x screen, small enough that the data URL
 *  stays cheap to keep in memory for every card. */
const THUMBNAIL_WIDTH = 540;

/**
 * Seeking a hair past zero is what makes iOS Safari paint a frame at all: at exactly
 * `0` it hands back a transparent bitmap, which is the classic "canvas thumbnails are
 * black on iPhone" bug. A tiny offset is below any real first frame of a video and
 * costs nothing on the browsers that did not have the problem to begin with.
 */
const FIRST_FRAME_OFFSET_S = 0.05;

async function capturePoster(src: string): Promise<string | null> {
  const already = posters.get(src);
  if (already !== undefined) return already;

  return new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    let drew = false;

    // Muted + inline is what lets a mobile browser decode without a user gesture.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = src;

    const timer = setTimeout(() => finish(null), CAPTURE_TIMEOUT_MS);

    function finish(value: string | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      if (value !== null) posters.set(src, value);
      resolve(value);
    }

    function draw() {
      if (drew) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        finish(null);
        return;
      }
      drew = true;

      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * THUMBNAIL_WIDTH);

      const context = canvas.getContext('2d');
      if (context === null) {
        finish(null);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        finish(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        // Tainted canvas or an exotic codec: the card falls back to its own placeholder,
        // which is a perfectly good outcome and never a broken image.
        finish(null);
      }
    }

    video.addEventListener('loadeddata', () => {
      // Ask for the offset frame; `seeked` paints it. If the browser refuses to seek
      // (some live or oddly-encoded files), draw whatever is already on screen.
      try {
        video.currentTime = FIRST_FRAME_OFFSET_S;
      } catch {
        draw();
      }
    });

    video.addEventListener('seeked', draw);
    video.addEventListener('error', () => finish(null));

    // Metadata alone is enough on the browsers that do paint at `loadeddata`.
    setTimeout(draw, 400);
  });
}

/** Deduplicates concurrent captures of the same source. */
function posterFor(src: string): Promise<string | null> {
  const running = inFlight.get(src);
  if (running !== undefined) return running;

  const request = capturePoster(src).finally(() => {
    inFlight.delete(src);
  });
  inFlight.set(src, request);
  return request;
}

/**
 * Thumbnail for one video, or `null` while there is none yet.
 *
 * `enabled` is the throttle: only the cards the carousel has actually put on stage ask
 * for a capture, so opening a company with three videos starts no work for the two
 * nobody has looked at.
 */
export function useVideoPoster(src: string, enabled: boolean): string | null {
  // Storing the source next to its thumbnail is what keeps a card from flashing the
  // previous video's frame for a tick after the carousel moves.
  const [state, setState] = useState<{ readonly src: string; readonly poster: string | null }>(() => ({
    src,
    poster: posters.get(src) ?? null,
  }));

  useEffect(() => {
    const known = posters.get(src);
    if (known !== undefined) {
      setState({ src, poster: known });
      return;
    }
    if (!enabled) return;

    let cancelled = false;
    void posterFor(src).then((poster) => {
      if (cancelled || poster === null) return;
      setState({ src, poster });
    });

    return () => {
      cancelled = true;
    };
  }, [src, enabled]);

  if (state.src === src) return state.poster;
  return posters.get(src) ?? null;
}
