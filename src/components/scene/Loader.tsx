'use client';

import { Html } from '@react-three/drei';

import { LoaderBody } from '@/components/scene/DomLoader';

/** In-canvas Suspense fallback, used while the logo textures decode. */
export function SceneLoader() {
  return (
    <Html center>
      <LoaderBody />
    </Html>
  );
}

export default SceneLoader;
