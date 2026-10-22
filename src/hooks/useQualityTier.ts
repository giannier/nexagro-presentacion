'use client';

import { useState } from 'react';

import {
  LOW_TIER_MAX_CORES,
  LOW_TIER_MAX_MEMORY_GB,
  LOW_TIER_VIEWPORT_WIDTH,
} from '@/lib/constants';

export type QualityTier = 'high' | 'low';

/** `navigator.deviceMemory` is a Chromium-only extension and is absent from lib.dom. */
type NavigatorWithDeviceMemory = Navigator & { readonly deviceMemory?: number };

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/**
 * One-shot capability probe.
 *
 * Returns `low` whenever ANY of the following holds:
 *  - coarse pointer on a small viewport (phone-class device)
 *  - four logical cores or fewer
 *  - four gigabytes of device memory or less
 *  - the user asked for reduced motion
 *
 * The `low` tier drops the three.js transmission pass, shadows and bloom, which is
 * the difference between 60 fps and a slideshow on mid-range hardware.
 */
export function detectQualityTier(): QualityTier {
  // SSR-safe default. The scene is client-only, so this branch is only a type guard.
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'high';

  if (matches('(prefers-reduced-motion: reduce)')) return 'low';

  const isCoarseSmall =
    matches('(pointer: coarse)') && window.innerWidth < LOW_TIER_VIEWPORT_WIDTH;
  if (isCoarseSmall) return 'low';

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores > 0 && cores <= LOW_TIER_MAX_CORES) return 'low';

  const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
  if (typeof memory === 'number' && memory > 0 && memory <= LOW_TIER_MAX_MEMORY_GB) return 'low';

  return 'high';
}

/**
 * Resolves the quality tier exactly once for the lifetime of the component.
 * The lazy initialiser runs during the first client render, so the very first
 * frame already uses the correct material and renderer configuration — there is
 * no high-tier flash on a phone.
 */
export function useQualityTier(): QualityTier {
  const [tier] = useState<QualityTier>(detectQualityTier);
  return tier;
}
