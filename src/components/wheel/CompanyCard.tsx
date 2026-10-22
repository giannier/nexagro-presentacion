'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { fitLogoSize } from '@/components/wheel/logoGeometry';
import { FOCUS_OPACITY_FAR, LOGO_SIZE } from '@/lib/constants';

/**
 * Everything the parent frame loop needs to drive one logo.
 * Mutating these objects is the ONLY way a logo ever animates; the component itself
 * renders once.
 */
export type CardHandle = {
  readonly index: number;
  readonly angle: number;
  readonly sinAngle: number;
  readonly cosAngle: number;
  readonly group: THREE.Group;
  readonly logoMaterial: THREE.MeshBasicMaterial;
};

type CompanyCardProps = {
  readonly index: number;
  readonly angle: number;
  readonly texture: THREE.Texture;
  readonly logoGeometry: THREE.BufferGeometry;
  readonly register: (index: number, handle: CardHandle | null) => void;
};

function readTextureAspect(texture: THREE.Texture): number {
  const image = texture.image as { width?: number; height?: number } | null;
  if (image == null) return 1;
  const { width, height } = image;
  if (typeof width !== 'number' || typeof height !== 'number' || height === 0) return 1;
  return width / height;
}

/**
 * One company logo on the wheel — no card, no glass.
 *
 * The material is unlit on purpose: `MeshBasicMaterial` with tone mapping disabled
 * renders every pixel of the PNG exactly as designed, so brand colours on the white
 * stage match the logo files one to one. It also needs no lights and no environment
 * map, which removes the most expensive parts of the previous scene.
 */
export function CompanyCard({ index, angle, texture, logoGeometry, register }: CompanyCardProps) {
  const groupRef = useRef<THREE.Group>(null);

  const logoMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: FOCUS_OPACITY_FAR,
        // Drop fully transparent texels so they never occlude the logo behind them.
        alphaTest: 0.02,
        depthWrite: false,
        toneMapped: false,
        side: THREE.FrontSide,
      }),
    [texture],
  );

  const logoSize = useMemo(() => fitLogoSize(readTextureAspect(texture), LOGO_SIZE), [texture]);

  const trig = useMemo(() => ({ sin: Math.sin(angle), cos: Math.cos(angle) }), [angle]);

  // Publish the handle to the parent loop. A layout effect runs before the first
  // rendered frame, so no logo is ever painted sitting at the untransformed origin.
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (group === null) return;

    register(index, {
      index,
      angle,
      sinAngle: trig.sin,
      cosAngle: trig.cos,
      group,
      logoMaterial,
    });

    return () => {
      register(index, null);
    };
  }, [index, angle, trig, logoMaterial, register]);

  useEffect(() => {
    return () => {
      logoMaterial.dispose();
    };
  }, [logoMaterial]);

  return (
    <group ref={groupRef}>
      <mesh
        geometry={logoGeometry}
        material={logoMaterial}
        scale={[logoSize.width, logoSize.height, 1]}
      />
    </group>
  );
}
