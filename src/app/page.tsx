'use client';

import dynamic from 'next/dynamic';

import { DomLoader } from '@/components/scene/Loader';

/**
 * The entire Three.js runtime is client-only.
 *
 * `ssr: false` keeps WebGL off the server and keeps this page a light static shell:
 * the backdrop and the `<noscript>` fallback are delivered immediately, and the
 * heavy scene chunk streams in behind the loader.
 */
const SceneCanvas = dynamic(
  () => import('@/components/scene/SceneCanvas').then((module) => module.SceneCanvas),
  { ssr: false, loading: () => <DomLoader /> },
);

export default function HomePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="backdrop-stage" aria-hidden="true" />

      <noscript>
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8 text-center">
          <p className="text-sm text-neutral-600">
            Esta experiencia requiere JavaScript para mostrar NEXAGRO Export.
          </p>
        </div>
      </noscript>

      <SceneCanvas />
    </main>
  );
}
