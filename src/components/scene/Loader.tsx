'use client';

import { Html } from '@react-three/drei';

/** Shared visual so the DOM-level and in-canvas loaders are indistinguishable. */
function LoaderBody() {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-900/15" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neutral-900/80" />
      </span>
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-neutral-500">
        Cargando ecosistema
      </p>
    </div>
  );
}

/** In-canvas Suspense fallback, used while the logo textures decode. */
export function SceneLoader() {
  return (
    <Html center>
      <LoaderBody />
    </Html>
  );
}

/**
 * DOM-level fallback shown by `next/dynamic` while the Three.js bundle downloads.
 * Rendered before any WebGL context exists, so it cannot use drei.
 */
export function DomLoader() {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center">
      <LoaderBody />
    </div>
  );
}

export default SceneLoader;
