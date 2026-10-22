'use client';

import gsap from 'gsap';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import { COMPANIES, COMPANY_COUNT } from '@/data/companies';
import {
  CONFIRM_SCALE,
  CONFIRM_Z_OFFSET,
  DRAG_SENSITIVITY,
  SELECT_CONFIRM_DURATION,
  SELECT_CONFIRM_FADE,
  SELECT_CONFIRM_FADE_DURATION,
  SELECT_CONFIRM_PULSE_DURATION,
  SELECT_RESTORE_DURATION,
  SELECT_ROTATION_SNAP_DURATION,
  SNAP_DURATION,
  SNAP_EASE,
} from '@/lib/constants';
import { angleStep, normalizeIndex, rotationForIndex } from '@/lib/math';

/**
 * Animatable scalars for the confirmation pulse.
 *
 * GSAP only ever writes into this plain object; `useFrame` is the single place that
 * pushes the values onto the scene graph. Keeping the tween target inert is what lets
 * the pulse run with zero React re-renders.
 */
export type SelectionProxy = {
  /** 0 -> 1 dim progress of the 18 non-selected logos. */
  fade: number;
  /** Outward travel of the chosen logo along the cylinder normal. */
  z: number;
  /** Absolute scale of the chosen logo. */
  scale: number;
};

export type WheelContextValue = {
  /* --- mutable per-frame state (never triggers a render) --- */
  readonly rotation: RefObject<number>;
  readonly velocity: RefObject<number>;
  readonly isDragging: RefObject<boolean>;
  readonly isSnapping: RefObject<boolean>;
  readonly isTransitioningRef: RefObject<boolean>;
  readonly activeIndexRef: RefObject<number>;
  readonly selectedIndexRef: RefObject<number>;
  readonly selection: RefObject<SelectionProxy>;
  /** Radians per pixel of drag, solved by `<CameraRig>` so logos track the finger. */
  readonly dragSensitivityRef: RefObject<number>;

  /* --- rendered state (changes rarely, on purpose) --- */
  readonly activeIndex: number;
  readonly isTransitioning: boolean;
  readonly hasInteracted: boolean;

  /* --- commands --- */
  readonly reportActiveIndex: (index: number) => void;
  readonly markInteracted: () => void;
  readonly killSnap: () => void;
  readonly snapToRotation: (target: number, duration?: number) => void;
  readonly nudge: (direction: number) => void;
  /** Rotates straight to an arbitrary company by the shortest path — for voice/search,
   *  where the target is not necessarily adjacent to whatever is currently in front. */
  readonly jumpToIndex: (index: number) => void;
  /** Plays the acknowledgement pulse. The navigation itself belongs to the anchor. */
  readonly confirmSelection: (index: number) => void;
};

const WheelContext = createContext<WheelContextValue | null>(null);

function createSelectionProxy(): SelectionProxy {
  return { fade: 0, z: 0, scale: 1 };
}

export function WheelProvider({ children }: { children: ReactNode }) {
  const rotation = useRef(0);
  const velocity = useRef(0);
  const isDragging = useRef(false);
  const isSnapping = useRef(false);
  const isTransitioningRef = useRef(false);
  const activeIndexRef = useRef(0);
  const selectedIndexRef = useRef(-1);
  const selection = useRef<SelectionProxy>(createSelectionProxy());
  const dragSensitivityRef = useRef<number>(DRAG_SENSITIVITY);

  const rotationProxy = useRef({ value: 0 });
  const snapTween = useRef<gsap.core.Tween | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const hasInteractedRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const reportActiveIndex = useCallback((index: number) => {
    if (activeIndexRef.current === index) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const markInteracted = useCallback(() => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    setHasInteracted(true);
  }, []);

  const killSnap = useCallback(() => {
    if (snapTween.current !== null) {
      snapTween.current.kill();
      snapTween.current = null;
    }
    isSnapping.current = false;
  }, []);

  const snapToRotation = useCallback(
    (target: number, duration: number = SNAP_DURATION) => {
      killSnap();
      isSnapping.current = true;
      velocity.current = 0;
      rotationProxy.current.value = rotation.current;

      snapTween.current = gsap.to(rotationProxy.current, {
        value: target,
        duration,
        ease: SNAP_EASE,
        overwrite: true,
        onUpdate: () => {
          rotation.current = rotationProxy.current.value;
        },
        onComplete: () => {
          isSnapping.current = false;
          snapTween.current = null;
        },
      });
    },
    [killSnap],
  );

  const nudge = useCallback(
    (direction: number) => {
      if (isTransitioningRef.current || COMPANY_COUNT <= 1) return;
      markInteracted();
      const step = angleStep(COMPANY_COUNT);
      const target = (Math.round(rotation.current / step) + direction) * step;
      snapToRotation(target, SNAP_DURATION);
    },
    [markInteracted, snapToRotation],
  );

  const jumpToIndex = useCallback(
    (index: number) => {
      if (isTransitioningRef.current) return;
      const target = normalizeIndex(index, COMPANY_COUNT);
      if (COMPANIES[target] === undefined) return;
      markInteracted();
      snapToRotation(rotationForIndex(target, rotation.current, COMPANY_COUNT), SNAP_DURATION);
    },
    [markInteracted, snapToRotation],
  );

  /**
   * Returns every selection scalar to rest and unlocks input.
   *
   * Idempotent and safe to call at any moment — including when nothing is in flight,
   * which is exactly what the bfcache and visibility recovery handlers below rely on.
   */
  const resetSelection = useCallback(() => {
    if (timeline.current !== null) {
      timeline.current.kill();
      timeline.current = null;
    }
    if (snapTween.current !== null) {
      snapTween.current.kill();
      snapTween.current = null;
    }

    const proxy = selection.current;
    proxy.fade = 0;
    proxy.z = 0;
    proxy.scale = 1;

    selectedIndexRef.current = -1;
    isTransitioningRef.current = false;
    velocity.current = 0;
    isDragging.current = false;
    isSnapping.current = false;

    setIsTransitioning(false);
  }, []);

  /**
   * Confirm + restore.
   *
   * The navigation has already been handed to the browser by the anchor, so this is an
   * acknowledgement rather than a departure: the other logos only dim, and everything
   * returns to rest on its own. That self-restore keeps the wheel usable when the user
   * switches back to this tab.
   */
  const confirmSelection = useCallback(
    (index: number) => {
      if (isTransitioningRef.current) return;
      if (COMPANIES[index] === undefined) return;

      isTransitioningRef.current = true;
      selectedIndexRef.current = index;
      setIsTransitioning(true);
      markInteracted();

      killSnap();
      velocity.current = 0;
      isDragging.current = false;

      const proxy = selection.current;
      proxy.fade = 0;
      proxy.z = 0;
      proxy.scale = 1;

      rotationProxy.current.value = rotation.current;
      const rotationTarget = rotationForIndex(index, rotation.current, COMPANY_COUNT);

      const tl = gsap.timeline({ onComplete: resetSelection });
      timeline.current = tl;

      // 1. Centre the chosen logo exactly, in case the snap had not fully resolved.
      tl.to(
        rotationProxy.current,
        {
          value: rotationTarget,
          duration: SELECT_ROTATION_SNAP_DURATION,
          ease: 'power2.out',
          onUpdate: () => {
            rotation.current = rotationProxy.current.value;
          },
        },
        0,
      );

      // 2. Dim the other eighteen logos. Never to zero — the user is coming back.
      tl.to(
        proxy,
        { fade: SELECT_CONFIRM_FADE, duration: SELECT_CONFIRM_FADE_DURATION, ease: 'power2.out' },
        0,
      );

      // 3. Pulse the chosen logo forward.
      tl.to(
        proxy,
        {
          z: CONFIRM_Z_OFFSET,
          scale: CONFIRM_SCALE,
          duration: SELECT_CONFIRM_PULSE_DURATION,
          ease: 'power3.out',
        },
        0,
      );

      // 4. Everything back to rest, then unlock.
      tl.to(
        proxy,
        { fade: 0, z: 0, scale: 1, duration: SELECT_RESTORE_DURATION, ease: 'power2.out' },
        SELECT_CONFIRM_DURATION,
      );
    },
    [killSnap, markInteracted, resetSelection],
  );

  // Strict Mode double-invokes effects; every tween is created from an event handler,
  // so the only thing to do here is guarantee nothing survives an unmount.
  useEffect(() => {
    return () => {
      if (snapTween.current !== null) {
        snapTween.current.kill();
        snapTween.current = null;
      }
      if (timeline.current !== null) {
        timeline.current.kill();
        timeline.current = null;
      }
    };
  }, []);

  /**
   * Recovery: a locked wheel must never outlive the user leaving the page.
   *
   * `pageshow` with `persisted` is the important one: a back/forward cache restore
   * brings this page back with its JS heap frozen exactly as it was left, and no React
   * update or effect would otherwise fire to clear it. Visibility and focus cover tab
   * switching, and are guarded so an ordinary refocus never disturbs a running pulse.
   */
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetSelection();
    };
    const handleReturn = () => {
      if (isTransitioningRef.current) resetSelection();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleReturn();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [resetSelection]);

  const value = useMemo<WheelContextValue>(
    () => ({
      rotation,
      velocity,
      isDragging,
      isSnapping,
      isTransitioningRef,
      activeIndexRef,
      selectedIndexRef,
      selection,
      dragSensitivityRef,
      activeIndex,
      isTransitioning,
      hasInteracted,
      reportActiveIndex,
      markInteracted,
      killSnap,
      snapToRotation,
      nudge,
      jumpToIndex,
      confirmSelection,
    }),
    [
      activeIndex,
      isTransitioning,
      hasInteracted,
      reportActiveIndex,
      markInteracted,
      killSnap,
      snapToRotation,
      nudge,
      jumpToIndex,
      confirmSelection,
    ],
  );

  return <WheelContext.Provider value={value}>{children}</WheelContext.Provider>;
}

export function useWheel(): WheelContextValue {
  const value = useContext(WheelContext);
  if (value === null) {
    throw new Error('useWheel must be used inside a <WheelProvider>.');
  }
  return value;
}
