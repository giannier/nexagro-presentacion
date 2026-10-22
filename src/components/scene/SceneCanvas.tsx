'use client';

import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { SceneLoader } from '@/components/scene/Loader';
import { CompanyShowcase } from '@/components/showcase/CompanyShowcase';
import { CompanyHud } from '@/components/ui/CompanyHud';
import { IsoBadge } from '@/components/ui/IsoBadge';
import { CompanyWheel } from '@/components/wheel/CompanyWheel';
import { fitLogoSize } from '@/components/wheel/logoGeometry';
import { QualityProvider, useQuality } from '@/context/QualityContext';
import { WheelProvider, useWheel } from '@/context/WheelContext';
import { COMPANIES } from '@/data/companies';
import { logoAspectRatio } from '@/data/logoAspectRatios';
import { preloadCompanyTextures } from '@/hooks/useCompanyTextures';
import { useWheelInput } from '@/hooks/useWheelPhysics';
import {
  CAMERA_BASE_DISTANCE,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_HEIGHT_MARGIN,
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  CAMERA_NEAR,
  CAMERA_WIDTH_MARGIN,
  DRAG_TRACKING_GAIN,
  LOGO_SIZE,
  PERF_DPR_FLOOR,
  RADIUS,
  SCENE_BACKGROUND,
} from '@/lib/constants';
import { clamp } from '@/lib/math';

// Start fetching the logo textures the moment this client chunk evaluates, which is
// well before the WebGL context is ready.
preloadCompanyTextures();

/* ------------------------------------------------------------------ *
 * Responsive framing
 * ------------------------------------------------------------------ */

/**
 * Solves the camera distance from the live viewport so the front logo is always framed:
 * a 9:16 phone needs far more pull-back than a 16:9 desktop. Also solves the drag
 * sensitivity from the same framing, so the logo under the finger follows the finger.
 *
 * Framed against the ACTIVE logo's own rendered size, not the square `LOGO_SIZE`
 * envelope every logo is fitted into. All nineteen logos are wider than tall — from
 * 1.2x (ynsumedic) to 3.1x (arbicop) — so a wordmark-style logo only ever occupies a
 * fraction of that square envelope's height. Framing against the envelope regardless of
 * a logo's own shape left every one of them short of the intended fill, the widest ones
 * dramatically so (arbicop rendered at roughly a third of the intended height). Solving
 * distance from each logo's real width and height — exactly what `<CompanyCard>` scales
 * its mesh to — makes every company fill the same target fraction of the panel
 * regardless of how wide its own mark is, and re-runs whenever the focused company
 * changes, not only on resize.
 */
function CameraRig() {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const { dragSensitivityRef, activeIndex } = useWheel();
  const logoSlug = COMPANIES[activeIndex]?.slug;

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (width === 0 || height === 0) return;

    const aspect = width / height;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const logo = fitLogoSize(logoSlug === undefined ? 1 : logoAspectRatio(logoSlug), LOGO_SIZE);
    const halfLogoWidth = logo.width * 0.5;
    const halfLogoHeight = logo.height * 0.5;

    const byHeight = (halfLogoHeight * CAMERA_HEIGHT_MARGIN) / tan;
    const byWidth = (halfLogoWidth * CAMERA_WIDTH_MARGIN) / (tan * aspect);
    const distance = clamp(
      Math.max(byWidth, byHeight),
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE,
    );

    camera.position.set(0, 0, RADIUS + distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Finger tracking. The front logo sits `distance` from the camera, so this is how
    // many CSS pixels one world unit spans on its plane; a small rotation then moves
    // that logo by `RADIUS * angle` units.
    const pixelsPerUnit = height / (2 * distance * tan);
    dragSensitivityRef.current = DRAG_TRACKING_GAIN / (pixelsPerUnit * RADIUS);
  }, [camera, width, height, dragSensitivityRef, logoSlug]);

  return null;
}

/** Steps the device pixel ratio down when the device cannot sustain the frame rate. */
function PerformanceGuard() {
  const setDpr = useThree((state) => state.setDpr);
  const { dpr } = useQuality();
  const maxDpr = dpr[1];

  const handleChange = useCallback(
    ({ factor }: { factor: number }) => {
      setDpr(clamp(PERF_DPR_FLOOR + (maxDpr - PERF_DPR_FLOOR) * factor, PERF_DPR_FLOOR, maxDpr));
    },
    [setDpr, maxDpr],
  );

  const handleFallback = useCallback(() => {
    setDpr(PERF_DPR_FLOOR);
  }, [setDpr]);

  return <PerformanceMonitor flipflops={3} onChange={handleChange} onFallback={handleFallback} />;
}

/* ------------------------------------------------------------------ *
 * Scene graph
 * ------------------------------------------------------------------ */

/**
 * No lights, no environment map, no post-processing. The logos are unlit, so the
 * scene is just textured planes on a white clear colour — the cheapest possible frame.
 */
function Scene() {
  return (
    <>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <CameraRig />

      <Suspense fallback={<SceneLoader />}>
        <CompanyWheel />
      </Suspense>

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <PerformanceGuard />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Experience shell
 * ------------------------------------------------------------------ */

function Experience() {
  const quality = useQuality();
  const captureRef = useRef<HTMLDivElement>(null);

  useWheelInput(captureRef);

  const dpr = useMemo<[number, number]>(() => [quality.dpr[0], quality.dpr[1]], [quality.dpr]);

  return (
    // Split stage: reference artwork on the left, the wheel on the right. Stacks on
    // portrait screens. The canvas sizes itself to its panel, and `<CameraRig>` reads
    // that size, so the framing adapts to the panel rather than to the window.
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white landscape:flex-row">
      <CompanyShowcase />

      <div className="relative min-h-0 flex-1">
        {/*
          The canvas always stops above the HUD, so the camera frames the logo inside
          the space that is actually free instead of centring it behind the buttons.
          Portrait needs more room because the chrome is stacked taller there.
        */}
        <div className="absolute inset-x-0 bottom-40 top-0 landscape:bottom-32">
          <Canvas
            dpr={dpr}
            // `flat` disables tone mapping: brand colours must reach the screen unaltered.
            flat
            frameloop="always"
            gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
            camera={{
              fov: CAMERA_FOV,
              near: CAMERA_NEAR,
              far: CAMERA_FAR,
              position: [0, 0, RADIUS + CAMERA_BASE_DISTANCE],
            }}
          >
            <Scene />
          </Canvas>

          {/* Overlays the canvas box itself, so its percentage offsets are relative to
              the space the camera actually frames the logo in. Sits under the capture
              layer below, and is pointer-events-none anyway. */}
          <IsoBadge />
        </div>

        {/*
          Input capture over the wheel panel only. It sits above the canvas and owns
          every wheel, pointer and touch gesture; taps are raycast manually by
          <CompanyWheel>. Keeping it off the left panel leaves the contact links there
          clickable. `touch-none` stops the browser scrolling mid-swipe.
        */}
        <div ref={captureRef} aria-hidden="true" className="absolute inset-0 z-10 touch-none" />

        <CompanyHud />
      </div>
    </div>
  );
}

/**
 * Client-only root of the 3D experience.
 *
 * Owns both providers because the quality probe must never run on the server, and
 * because the HTML chrome outside the canvas shares the same wheel state as the
 * scene inside it. React context crosses the canvas boundary via the context bridge
 * that react-three-fiber installs.
 */
export function SceneCanvas() {
  return (
    <QualityProvider>
      <WheelProvider>
        <Experience />
      </WheelProvider>
    </QualityProvider>
  );
}

export default SceneCanvas;
