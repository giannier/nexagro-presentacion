'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useWheel } from '@/context/WheelContext';
import { COMPANY_COUNT } from '@/data/companies';
import {
  FRICTION,
  MAX_VELOCITY,
  POINTER_IDLE_RESET_MS,
  SNAP_DURATION,
  SNAP_EPSILON,
  SNAP_VELOCITY_THRESHOLD,
  TAP_THRESHOLD_PX,
  VELOCITY_SMOOTHING,
  WHEEL_LINE_HEIGHT,
  WHEEL_PAGE_HEIGHT,
  WHEEL_SENSITIVITY,
} from '@/lib/constants';
import { angleStep, clamp } from '@/lib/math';

/**
 * Advances the wheel rotation by one frame.
 *
 * Returns a stable callback rather than registering its own `useFrame`, so the whole
 * experience runs from a single frame loop owned by `<CompanyWheel>`. That removes any
 * ambiguity about whether physics ran before the cards read the rotation.
 *
 * Ownership of `rotation.current` is exclusive and moves between three writers:
 *  - the GSAP selection timeline while a transition is playing,
 *  - the GSAP snap tween while snapping,
 *  - this integrator otherwise (and the pointer handler during an active drag).
 */
export function useWheelPhysics(): (delta: number) => number {
  const { rotation, velocity, isDragging, isSnapping, isTransitioningRef, snapToRotation } =
    useWheel();

  return useCallback(
    (delta: number): number => {
      // A tween owns the rotation; do not fight it.
      if (isTransitioningRef.current || isSnapping.current) return rotation.current;

      // During a drag the pointer handler writes the rotation directly.
      if (isDragging.current) return rotation.current;

      if (velocity.current !== 0) {
        rotation.current += velocity.current * delta;
        // Frame-rate independent decay: FRICTION is defined per 1/60 s.
        velocity.current *= Math.pow(FRICTION, delta * 60);
      }

      if (Math.abs(velocity.current) < SNAP_VELOCITY_THRESHOLD) {
        velocity.current = 0;

        // Stateless snap trigger: if the wheel is at rest but off-grid, commit a snap.
        // Once the tween lands on an exact multiple of the step this is a no-op.
        const step = angleStep(COMPANY_COUNT);
        const nearest = Math.round(rotation.current / step) * step;
        if (Math.abs(rotation.current - nearest) > SNAP_EPSILON) {
          snapToRotation(nearest, SNAP_DURATION);
        }
      }

      return rotation.current;
    },
    [rotation, velocity, isDragging, isSnapping, isTransitioningRef, snapToRotation],
  );
}

/**
 * Converts a `wheel` event into a consistent pixel delta regardless of `deltaMode`.
 *
 * Takes whichever axis dominates: a mouse only ever reports `deltaY`, while a trackpad
 * swiped sideways reports `deltaX`. Both must spin a wheel that now travels horizontally.
 */
function normalizeWheelDelta(event: WheelEvent): number {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

  switch (event.deltaMode) {
    case 1: // DOM_DELTA_LINE
      return delta * WHEEL_LINE_HEIGHT;
    case 2: // DOM_DELTA_PAGE
      return delta * WHEEL_PAGE_HEIGHT;
    default: // DOM_DELTA_PIXEL
      return delta;
  }
}

/**
 * Binds wheel, pointer-drag and keyboard input to the full-screen capture layer.
 *
 * Runs outside the `<Canvas>`. A tap (pointer travel under `TAP_THRESHOLD_PX`) is
 * forwarded to the raycast handler that `<CompanyWheel>` registers, because the capture
 * layer sits above the canvas and would otherwise swallow every R3F pointer event.
 *
 * Direction contract (the wheel travels horizontally):
 *  - dragging follows the finger (swipe left, cards travel left),
 *  - scrolling down, swiping a trackpad left and ArrowRight/ArrowDown all advance to the
 *    next company, so the cards travel from right to left.
 */
export function useWheelInput(targetRef: React.RefObject<HTMLElement | null>): void {
  const {
    rotation,
    velocity,
    isDragging,
    isTransitioningRef,
    dragSensitivityRef,
    killSnap,
    markInteracted,
    nudge,
  } = useWheel();

  const pointerId = useRef<number | null>(null);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const travelled = useRef(0);
  const smoothedVelocity = useRef(0);

  useEffect(() => {
    const element = targetRef.current;
    if (element === null) return;
    // A single company has nothing to spin to: leave the logo fixed and the page inert.
    if (COMPANY_COUNT <= 1) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (isTransitioningRef.current) return;
      if (pointerId.current !== null) return;

      pointerId.current = event.pointerId;
      element.setPointerCapture(event.pointerId);

      killSnap();
      markInteracted();

      isDragging.current = true;
      velocity.current = 0;
      smoothedVelocity.current = 0;
      travelled.current = 0;
      startX.current = event.clientX;
      startY.current = event.clientY;
      lastX.current = event.clientX;
      lastTime.current = event.timeStamp;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerId.current !== event.pointerId) return;
      if (!isDragging.current || isTransitioningRef.current) return;

      const deltaPixels = event.clientX - lastX.current;
      // Negated: an increasing rotation carries cards leftwards, so a finger moving
      // left (negative delta) must increase it for the card to follow the finger.
      const deltaRadians = -deltaPixels * dragSensitivityRef.current;
      rotation.current += deltaRadians;

      const deltaSeconds = (event.timeStamp - lastTime.current) / 1000;
      if (deltaSeconds > 0) {
        const instantaneous = clamp(deltaRadians / deltaSeconds, -MAX_VELOCITY, MAX_VELOCITY);
        smoothedVelocity.current =
          smoothedVelocity.current * (1 - VELOCITY_SMOOTHING) +
          instantaneous * VELOCITY_SMOOTHING;
      }

      travelled.current += Math.abs(deltaPixels);
      lastX.current = event.clientX;
      lastTime.current = event.timeStamp;
    };

    const endDrag = (event: PointerEvent) => {
      if (pointerId.current !== event.pointerId) return;

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      pointerId.current = null;
      isDragging.current = false;

      if (isTransitioningRef.current) return;

      const horizontal = Math.abs(event.clientX - startX.current);
      const vertical = Math.abs(event.clientY - startY.current);
      const isTap = Math.hypot(horizontal, vertical) < TAP_THRESHOLD_PX;

      // A tap is a brake: it stops a coasting wheel on the spot. There is nothing to
      // hit-test any more, since only the focused company is ever on screen.
      if (isTap) {
        velocity.current = 0;
        return;
      }

      // A finger that paused before lifting should not launch the wheel.
      const idleMs = event.timeStamp - lastTime.current;
      velocity.current =
        idleMs > POINTER_IDLE_RESET_MS
          ? 0
          : clamp(smoothedVelocity.current, -MAX_VELOCITY, MAX_VELOCITY);
    };

    const handleWheel = (event: WheelEvent) => {
      if (isTransitioningRef.current) return;
      event.preventDefault();

      killSnap();
      markInteracted();

      const next = velocity.current + normalizeWheelDelta(event) * WHEEL_SENSITIVITY;
      velocity.current = clamp(next, -MAX_VELOCITY, MAX_VELOCITY);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTransitioningRef.current) return;
      // The listener is global, so arrow keys pressed while typing in a form field or
      // navigating an open dialog must never spin the wheel behind it.
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, dialog')) return;

      const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      if (!forward && !backward) return;

      event.preventDefault();
      nudge(forward ? 1 : -1);
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
    // Non-passive: the page must not scroll while the wheel is being spun.
    element.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', endDrag);
      element.removeEventListener('pointercancel', endDrag);
      element.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);

      if (pointerId.current !== null && element.hasPointerCapture(pointerId.current)) {
        element.releasePointerCapture(pointerId.current);
      }
      pointerId.current = null;
      isDragging.current = false;
    };
  }, [
    targetRef,
    rotation,
    velocity,
    isDragging,
    isTransitioningRef,
    dragSensitivityRef,
    killSnap,
    markInteracted,
    nudge,
  ]);
}
