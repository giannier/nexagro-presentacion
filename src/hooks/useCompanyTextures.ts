'use client';

import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { useQuality } from '@/context/QualityContext';
import { LOGO_PATHS } from '@/data/companies';

/**
 * Loads and configures all company logo textures.
 *
 * Suspends until every texture is decoded, so the caller must sit inside a
 * `<Suspense>` boundary. Configuration is done in `useMemo` rather than an effect so
 * the very first rendered frame already has the correct colour space and filtering —
 * otherwise the logos flash washed-out for one frame.
 */
export function useCompanyTextures(): THREE.Texture[] {
  const gl = useThree((state) => state.gl);
  const { anisotropy } = useQuality();

  const textures = useTexture(LOGO_PATHS) as THREE.Texture[];

  useMemo(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    const resolvedAnisotropy = Math.max(1, Math.min(anisotropy, maxAnisotropy));

    for (const texture of textures) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = resolvedAnisotropy;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
    }
  }, [textures, gl, anisotropy]);

  useEffect(() => {
    return () => {
      for (const texture of textures) {
        texture.dispose();
      }
      // Drop the suspense cache entries too, otherwise a remount would hand back
      // textures whose GPU resources have already been released.
      useTexture.clear(LOGO_PATHS);
    };
  }, [textures]);

  return textures;
}

/** Warms the suspense cache so the loader is shown once, at a predictable moment. */
export function preloadCompanyTextures(): void {
  useTexture.preload(LOGO_PATHS);
}
