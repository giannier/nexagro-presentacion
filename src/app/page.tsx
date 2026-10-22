'use client';

import dynamic from 'next/dynamic';

import { DomLoader } from '@/components/scene/DomLoader';
import { COMPANY_COUNT } from '@/data/companies';

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

/** Light client-only stage for a single company (the HUD reads `window`, so no SSR). */
const StaticStage = dynamic(
  () => import('@/components/scene/StaticStage').then((module) => module.StaticStage),
  { ssr: false },
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

      {/* One company: plain HTML, no WebGL. Several: the 3D wheel (chunk loads only then). */}
      {COMPANY_COUNT === 1 ? <StaticStage /> : <SceneCanvas />}
    </main>
  );
}
