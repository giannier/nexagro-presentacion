import * as THREE from 'three';

/**
 * Unit plane shared by every logo.
 *
 * Call this ONCE and hand the result to every logo; per-logo sizing is applied through
 * `mesh.scale`. Nineteen identical geometries would mean nineteen buffer uploads.
 */
export function createLogoGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, 1);
}

/**
 * Fits a texture's aspect ratio inside a square box of `maxSize`.
 * Returned values are used directly as the logo mesh scale.
 */
export function fitLogoSize(aspect: number, maxSize: number): { width: number; height: number } {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return safeAspect >= 1
    ? { width: maxSize, height: maxSize / safeAspect }
    : { width: maxSize * safeAspect, height: maxSize };
}
