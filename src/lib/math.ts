import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

/** Frame-rate independent exponential approach. Thin wrapper kept for a single import site. */
export function damp(current: number, target: number, lambda: number, deltaTime: number): number {
  return THREE.MathUtils.damp(current, target, lambda, deltaTime);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Hermite interpolation between two edges. Returns 0 below `edge0` and 1 above `edge1`. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Normalises any angle into the `[-PI, PI]` range. */
export function wrapAngle(angle: number): number {
  let wrapped = (angle + Math.PI) % TWO_PI;
  if (wrapped < 0) wrapped += TWO_PI;
  return wrapped - Math.PI;
}

/** Angular distance between two consecutive cards on the cylinder. */
export function angleStep(count: number): number {
  return TWO_PI / count;
}

/** Positive modulo, so a negative rotation still maps onto a valid card index. */
export function normalizeIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/**
 * Absolute wheel rotation that places `index` at the front, taking the shortest
 * path from `currentRotation`. The wheel rotation is unbounded, so the target has
 * to be lifted into the same revolution the user is currently on.
 */
export function rotationForIndex(index: number, currentRotation: number, count: number): number {
  const base = index * angleStep(count);
  const revolutions = Math.round((currentRotation - base) / TWO_PI);
  return base + revolutions * TWO_PI;
}

export { TWO_PI };
