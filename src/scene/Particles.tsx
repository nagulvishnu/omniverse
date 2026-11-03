import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, CanvasTexture, Points } from "three";

let dotTex: CanvasTexture | null = null;
/** Shared soft round sprite (one GPU texture for every particle system). */
export function getDotTexture() {
  if (!dotTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    dotTex = new CanvasTexture(c);
  }
  return dotTex;
}

interface RisingProps {
  count: number;
  color: string;
  size?: number;
  area: [number, number, number];
  speed?: number;
  wobble?: number;
  opacity?: number;
  position?: [number, number, number];
  down?: boolean;
}

/** CPU-light drifting particles that loop inside a box volume. */
export function RisingParticles({
  count,
  color,
  size = 0.18,
  area,
  speed = 0.5,
  wobble = 0.3,
  opacity = 0.9,
  position = [0, 0, 0],
  down = false,
}: RisingProps) {
  const ref = useRef<Points>(null);
  const { positions, seeds } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * area[0];
      p[i * 3 + 1] = (Math.random() - 0.5) * area[1];
      p[i * 3 + 2] = (Math.random() - 0.5) * area[2];
      s[i] = Math.random();
    }
    return { positions: p, seeds: s };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, area[0], area[1], area[2]]);

  useEffect(() => {
    const g = ref.current?.geometry;
    return () => g?.dispose();
  }, []);

  useFrame((s, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = s.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const half = area[1] / 2;
    for (let i = 0; i < count; i++) {
      const k = 0.4 + seeds[i] * 0.9;
      let y = arr[i * 3 + 1] + (down ? -1 : 1) * speed * k * d;
      if (y > half) y = -half;
      if (y < -half) y = half;
      arr[i * 3 + 1] = y;
      arr[i * 3] += Math.sin(t * 0.7 + seeds[i] * 20) * wobble * d;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        map={getDotTexture()}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
        alphaTest={0.01}
      />
    </points>
  );
}
