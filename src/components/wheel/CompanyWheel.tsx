'use client';

import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';

import { CompanyCard, type CardHandle } from '@/components/wheel/CompanyCard';
import { createLogoGeometry } from '@/components/wheel/logoGeometry';
import { useWheel } from '@/context/WheelContext';
import { COMPANIES, COMPANY_COUNT } from '@/data/companies';
import { useCompanyTextures } from '@/hooks/useCompanyTextures';
import { useWheelPhysics } from '@/hooks/useWheelPhysics';
import {
  BACKFACE_DIM,
  BACKFACE_EDGE,
  BILLBOARD_BLEND,
  FOCUS_DAMP_LAMBDA,
  FOCUS_INNER,
  FOCUS_OPACITY_FAR,
  FOCUS_OPACITY_NEAR,
  FOCUS_OUTER,
  FOCUS_SCALE_FAR,
  FOCUS_SCALE_NEAR,
  MAX_FRAME_DELTA,
  RADIUS,
  SELECT_OTHERS_SCALE,
} from '@/lib/constants';
import { angleStep, damp, normalizeIndex, smoothstep, wrapAngle } from '@/lib/math';

/**
 * The cylinder.
 *
 * Owns the ONLY `useFrame` callback of the experience. Physics, the active-index
 * resolution, every per-logo transform and the confirmation pulse are all driven from
 * this single loop over plain refs. No logo component re-renders while the wheel moves.
 */
export function CompanyWheel() {
  const wheel = useWheel();
  const advance = useWheelPhysics();
  const textures = useCompanyTextures();

  const groupRef = useRef<THREE.Group>(null);
  const handles = useRef<Array<CardHandle | null>>(
    Array.from({ length: COMPANY_COUNT }, () => null),
  );

  const logoGeometry = useMemo(() => createLogoGeometry(), []);

  useEffect(() => {
    return () => {
      logoGeometry.dispose();
    };
  }, [logoGeometry]);

  const angles = useMemo(() => {
    const step = angleStep(COMPANY_COUNT);
    return COMPANIES.map((_, index) => index * step);
  }, []);

  const register = useCallback((index: number, handle: CardHandle | null) => {
    handles.current[index] = handle;
  }, []);

  /* ------------------------------------------------------------------ *
   * The single frame loop
   * ------------------------------------------------------------------ */
  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (group === null) return;

    // Clamp so a backgrounded tab cannot teleport the wheel on return.
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);

    const rotation = advance(delta);
    // The cylinder stands upright and spins about Y. The sign is negated so the rest of
    // the maths keeps one convention: logo `i` is in front when `rotation === angle`,
    // and an increasing rotation carries logos right to left.
    group.rotation.y = -rotation;

    const step = angleStep(COMPANY_COUNT);
    wheel.reportActiveIndex(normalizeIndex(Math.round(rotation / step), COMPANY_COUNT));

    const selection = wheel.selection.current;
    const selectedIndex = wheel.selectedIndexRef.current;
    const isTransitioning = wheel.isTransitioningRef.current;

    const list = handles.current;

    for (let index = 0; index < list.length; index += 1) {
      const handle = list[index];
      // `noUncheckedIndexedAccess` widens the element type, and a logo that has not
      // registered yet is legitimately absent for its first frame.
      if (handle === null || handle === undefined) continue;

      const offset = wrapAngle(rotation - handle.angle);
      const distance = Math.abs(offset) / Math.PI;
      const focus = 1 - smoothstep(FOCUS_INNER, FOCUS_OUTER, distance);

      // Billboard on the Y axis only: the logo keeps orbiting the cylinder but its face
      // stays square to the camera. The parent group yaws by -rotation, so a local yaw
      // of +rotation cancels it. Blend 0 would leave the raw cylinder normal.
      const cylinderRotation = handle.angle;
      const billboardRotation = rotation;
      handle.group.rotation.y =
        cylinderRotation + (billboardRotation - cylinderRotation) * BILLBOARD_BLEND;

      const targetScale = FOCUS_SCALE_FAR + (FOCUS_SCALE_NEAR - FOCUS_SCALE_FAR) * focus;
      let targetOpacity = FOCUS_OPACITY_FAR + (FOCUS_OPACITY_NEAR - FOCUS_OPACITY_FAR) * focus;

      // Logos on the far side of the cylinder read as depth, not as clutter.
      const facing = Math.cos(offset);
      targetOpacity *=
        BACKFACE_DIM + (1 - BACKFACE_DIM) * smoothstep(-BACKFACE_EDGE, BACKFACE_EDGE, facing);

      let radius = RADIUS;

      if (isTransitioning && index === selectedIndex) {
        // Pulsing logo: GSAP owns these values outright, so no damping.
        radius = RADIUS + selection.z;
        handle.group.scale.setScalar(selection.scale);
        handle.logoMaterial.opacity = 1;
      } else if (isTransitioning) {
        // The other eighteen ease back while the pulse plays.
        const scale = targetScale + (SELECT_OTHERS_SCALE - targetScale) * selection.fade;
        handle.group.scale.setScalar(scale);
        handle.logoMaterial.opacity = targetOpacity * (1 - selection.fade);
      } else {
        handle.group.scale.setScalar(
          damp(handle.group.scale.x, targetScale, FOCUS_DAMP_LAMBDA, delta),
        );
        handle.logoMaterial.opacity = damp(
          handle.logoMaterial.opacity,
          targetOpacity,
          FOCUS_DAMP_LAMBDA,
          delta,
        );
      }

      handle.group.position.set(handle.sinAngle * radius, 0, handle.cosAngle * radius);
    }
  });

  return (
    <group ref={groupRef}>
      {COMPANIES.map((company, index) => {
        const texture = textures[index];
        const angle = angles[index];
        if (texture === undefined || angle === undefined) return null;

        return (
          <CompanyCard
            key={company.slug}
            index={index}
            angle={angle}
            texture={texture}
            logoGeometry={logoGeometry}
            register={register}
          />
        );
      })}
    </group>
  );
}

export default CompanyWheel;
