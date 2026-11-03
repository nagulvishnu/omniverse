import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { CanvasTexture, Group, Mesh, MeshStandardMaterial, AdditiveBlending, DoubleSide } from "three";
import type { WorldConfig } from "@/config/worlds";
import type { SurfaceHandle } from "./PortalSurface";
import { RisingParticles } from "../Particles";

interface FrameProps {
  world: WorldConfig;
  state: SurfaceHandle;
}

/** emissive intensity that responds to hover / focus */
function useEnergy(state: SurfaceHandle, base: number, hover = 0.9, focus = 1.2) {
  const ref = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (ref.current) ref.current.emissiveIntensity = base + state.hover * hover + state.focus * focus;
  });
  return ref;
}

const basic = { toneMapped: false } as const;

/* ───────────── AETHER — gravitational ring, orbiting satellites ───────────── */
export function AetherFrame({ world, state }: FrameProps) {
  const mat = useEnergy(state, 0.5);
  const sats = useRef<Group>(null);
  const grav = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = 1 + state.hover * 1.2 + state.focus * 2;
    if (sats.current) sats.current.rotation.z = t * 0.25 * k;
    if (grav.current) {
      grav.current.rotation.z = -t * 0.12 * k;
      grav.current.rotation.x = 1.15 + Math.sin(t * 0.4) * 0.12;
    }
  });
  return (
    <group>
      <mesh>
        <torusGeometry args={[5.3, 0.24, 16, 96]} />
        <meshStandardMaterial ref={mat} color="#0d1030" metalness={0.9} roughness={0.28} emissive={world.colors.primary} />
      </mesh>
      <mesh>
        <torusGeometry args={[5.62, 0.045, 8, 128]} />
        <meshBasicMaterial color={world.colors.accent} {...basic} />
      </mesh>
      <group ref={grav}>
        <mesh>
          <torusGeometry args={[7.2, 0.035, 6, 160]} />
          <meshBasicMaterial color={world.colors.secondary} {...basic} transparent opacity={0.8} />
        </mesh>
        <mesh>
          <torusGeometry args={[7.7, 0.02, 6, 160]} />
          <meshBasicMaterial color={world.colors.primary} {...basic} transparent opacity={0.6} />
        </mesh>
      </group>
      <group ref={sats}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 6.3, Math.sin(a) * 6.3, 0]}>
              <sphereGeometry args={[i % 2 ? 0.2 : 0.32, 16, 12]} />
              <meshBasicMaterial color={i % 2 ? world.colors.accent : world.colors.secondary} {...basic} />
            </mesh>
          );
        })}
      </group>
      <RisingParticles count={50} color={world.colors.accent} area={[13, 13, 3]} size={0.14} speed={0.25} />
    </group>
  );
}

/* ───────────── ABYSS — organic oval, coral spikes, bioluminescence ───────────── */
export function AbyssFrame({ world, state }: FrameProps) {
  const mat = useEnergy(state, 0.45);
  const dots = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    dots.current?.children.forEach((c, i) => {
      const s = 0.7 + 0.5 * Math.sin(t * 2 + i * 1.7) + state.hover * 0.4 + state.focus * 0.5;
      c.scale.setScalar(Math.max(0.3, s));
    });
  });
  const dotPos = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return [Math.cos(a) * 4.0, Math.sin(a) * 5.65, 0.1] as [number, number, number];
      }),
    [],
  );
  const coral = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI + 0.35 + (i / 10) * (Math.PI - 0.7);
        return { a, x: Math.cos(a) * 4.5, y: Math.sin(a) * 6.2, h: 0.9 + ((i * 37) % 10) / 6 };
      }),
    [],
  );
  return (
    <group>
      <mesh scale={[0.8, 1.12, 1]}>
        <torusGeometry args={[5, 0.34, 16, 96]} />
        <meshStandardMaterial ref={mat} color="#06243a" metalness={0.5} roughness={0.55} emissive={world.colors.primary} />
      </mesh>
      <group ref={dots}>
        {dotPos.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial color={i % 3 ? world.colors.accent : "#ff7de0"} {...basic} />
          </mesh>
        ))}
      </group>
      {coral.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, 0]} rotation={[0, 0, c.a - Math.PI / 2 + (i % 2 ? 0.25 : -0.25)]}>
          <coneGeometry args={[0.28, c.h, 6]} />
          <meshStandardMaterial color={i % 2 ? "#ff6fae" : "#17c8b4"} emissive={i % 2 ? "#a01f63" : "#0b7d78"} emissiveIntensity={0.9} />
        </mesh>
      ))}
      <RisingParticles count={70} color="#bff6ff" area={[10, 14, 3]} size={0.2} speed={0.9} wobble={0.5} opacity={0.75} />
    </group>
  );
}

/* ───────────── NEOVERSE — neon rectangle, holo panels, scan line ───────────── */
export function NeoverseFrame({ world, state }: FrameProps) {
  const mat = useEnergy(state, 0.7);
  const scan = useRef<Mesh>(null);
  const panels = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (scan.current) scan.current.position.y = Math.sin(t * (1 + state.focus)) * 4.5;
    panels.current?.children.forEach((c, i) => {
      c.position.y = (i - 1) * 3.2 + Math.sin(t * 0.8 + i * 2) * 0.35;
      c.rotation.y = Math.sin(t * 0.5 + i) * 0.5;
    });
  });
  const bars: [number[], number[]][] = [
    [[0, 5.2, 0], [7.8, 0.4, 0.6]],
    [[0, -5.2, 0], [7.8, 0.4, 0.6]],
    [[-3.6, 0, 0], [0.4, 10.4, 0.6]],
    [[3.6, 0, 0], [0.4, 10.4, 0.6]],
  ];
  return (
    <group>
      {bars.map(([p, s], i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={s as [number, number, number]} />
          <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#0a0d22" metalness={0.8} roughness={0.3} emissive={world.colors.primary} emissiveIntensity={0.7} />
        </mesh>
      ))}
      {[-4.4, 4.4].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.7, 13, 0.7]} />
            <meshStandardMaterial color="#080b1c" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.36]}>
            <boxGeometry args={[0.12, 12.4, 0.04]} />
            <meshBasicMaterial color={world.colors.secondary} {...basic} />
          </mesh>
          <mesh position={[0, 7.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.5, 6]} />
            <meshBasicMaterial color={world.colors.accent} {...basic} />
          </mesh>
        </group>
      ))}
      <mesh ref={scan} position={[0, 0, 0.05]}>
        <planeGeometry args={[7.2, 0.1]} />
        <meshBasicMaterial color={world.colors.accent} {...basic} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={panels}>
        {[-1, 0, 1].map((k, i) => (
          <group key={i} position={[k % 2 === 0 ? (i === 1 ? 6.4 : -6.4) : -6.6, 0, 0.5]}>
            <mesh>
              <planeGeometry args={[1.8, 2.6]} />
              <meshBasicMaterial color={i === 1 ? world.colors.secondary : world.colors.primary} {...basic} transparent opacity={0.18} side={DoubleSide} depthWrite={false} />
              <Edges color={world.colors.accent} />
            </mesh>
          </group>
        ))}
      </group>
      <RisingParticles count={40} color={world.colors.accent} area={[10, 14, 2]} size={0.1} speed={1.4} wobble={0.05} />
    </group>
  );
}

/* ───────────── MYTHORA — stone arch, gold trim, floating runes ───────────── */
function makeRuneTexture(seed: number, color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.strokeStyle = color;
  g.lineWidth = 7;
  g.lineCap = "round";
  g.shadowColor = color;
  g.shadowBlur = 14;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.beginPath();
  g.moveTo(64, 14);
  g.lineTo(64, 114);
  for (let i = 0; i < 3; i++) {
    const y = 28 + rnd() * 70;
    const dir = rnd() > 0.5 ? 1 : -1;
    g.moveTo(64, y);
    g.lineTo(64 + dir * (18 + rnd() * 26), y + (rnd() - 0.3) * 38);
  }
  g.stroke();
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.lineWidth = 3;
  g.stroke();
  return new CanvasTexture(c);
}

export function MythoraFrame({ world, state }: FrameProps) {
  const mat = useEnergy(state, 0.35);
  const runes = useRef<Group>(null);
  const crystals = useRef<Group>(null);
  const textures = useMemo(() => [1, 2, 3, 4, 5].map((i) => makeRuneTexture(i, world.colors.accent)), [world]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = 1 + state.hover + state.focus * 1.5;
    if (runes.current) {
      runes.current.rotation.z = t * 0.18 * k;
      runes.current.children.forEach((c, i) => {
        c.rotation.z = -runes.current!.rotation.z;
        c.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.12 + state.focus * 0.25);
      });
    }
    crystals.current?.children.forEach((c, i) => {
      c.rotation.y = t * (0.6 + i * 0.2);
      c.position.y += Math.sin(t + i) * 0.003;
    });
  });
  return (
    <group>
      {[-3.8, 3.8].map((x) => (
        <group key={x} position={[x, -1.6, 0]}>
          <mesh>
            <boxGeometry args={[0.95, 7.2, 0.95]} />
            <meshStandardMaterial ref={x < 0 ? mat : undefined} color="#2a2038" roughness={0.9} metalness={0.1} emissive={world.colors.primary} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 3.7, 0]}>
            <boxGeometry args={[1.25, 0.3, 1.25]} />
            <meshStandardMaterial color="#3a2d4d" roughness={0.8} />
          </mesh>
          <mesh position={[0, -3.5, 0]}>
            <boxGeometry args={[1.35, 0.4, 1.35]} />
            <meshStandardMaterial color="#3a2d4d" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.5]}>
            <boxGeometry args={[0.1, 6.4, 0.03]} />
            <meshBasicMaterial color={world.colors.primary} {...basic} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2, 0]}>
        <torusGeometry args={[3.8, 0.47, 12, 64, Math.PI]} />
        <meshStandardMaterial color="#2a2038" roughness={0.9} emissive={world.colors.primary} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 2, 0.3]}>
        <torusGeometry args={[3.45, 0.05, 6, 64, Math.PI]} />
        <meshBasicMaterial color={world.colors.primary} {...basic} />
      </mesh>
      <mesh position={[0, 6.0, 0]}>
        <octahedronGeometry args={[0.55, 0]} />
        <meshBasicMaterial color={world.colors.secondary} {...basic} />
      </mesh>
      <group ref={runes} position={[0, 0.6, 0.6]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 6.3, Math.sin(a) * 6.3, 0]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial map={textures[i % textures.length]} transparent {...basic} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
            </mesh>
          );
        })}
      </group>
      <group ref={crystals}>
        {[-6.4, 6.4, 0].map((x, i) => (
          <mesh key={i} position={[x, i === 2 ? 7.2 : -2 + i * 5, 0.6]}>
            <octahedronGeometry args={[0.45, 0]} />
            <meshBasicMaterial color={i % 2 ? world.colors.accent : world.colors.secondary} {...basic} />
          </mesh>
        ))}
      </group>
      <RisingParticles count={70} color={world.colors.primary} area={[12, 13, 3]} size={0.16} speed={0.5} />
    </group>
  );
}

/* ───────────── NEXDRIVE — chrome hexagon, energy rings ───────────── */
export function NexdriveFrame({ world, state }: FrameProps) {
  const mat = useEnergy(state, 0.1, 0.5, 0.8);
  const rings = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = 1 + state.hover + state.focus * 2.5;
    rings.current?.children.forEach((c, i) => {
      c.rotation.x = t * (0.5 + i * 0.25) * k * (i % 2 ? -1 : 1) + i;
      c.rotation.y = t * (0.35 + i * 0.2) * k + i * 2;
    });
  });
  const apothem = 4.7;
  const side = 2 * apothem * Math.tan(Math.PI / 6);
  return (
    <group>
      {Array.from({ length: 6 }).map((_, i) => {
        const th = Math.PI / 6 + (i * Math.PI) / 3 + Math.PI / 3 - Math.PI / 6;
        // edge centres at 90°, 150°, ... (top edge first)
        const ang = Math.PI / 2 + (i * Math.PI) / 3;
        void th;
        return (
          <group key={i} position={[Math.cos(ang) * apothem, Math.sin(ang) * apothem, 0]} rotation={[0, 0, ang + Math.PI / 2]}>
            <mesh>
              <boxGeometry args={[side + 0.45, 0.42, 0.7]} />
              <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#c9d3e0" metalness={1} roughness={0.22} emissive={world.colors.primary} />
            </mesh>
            <mesh position={[0, -0.0, 0.36]}>
              <boxGeometry args={[side - 0.4, 0.07, 0.03]} />
              <meshBasicMaterial color={world.colors.primary} {...basic} />
            </mesh>
          </group>
        );
      })}
      <group ref={rings}>
        {[6.6, 7.3, 8.0].map((r, i) => (
          <mesh key={i}>
            <torusGeometry args={[r, 0.04, 6, 140]} />
            <meshBasicMaterial color={i === 1 ? world.colors.accent : world.colors.primary} {...basic} />
          </mesh>
        ))}
      </group>
      <RisingParticles count={40} color={world.colors.accent} area={[10, 12, 3]} size={0.1} speed={2.2} wobble={0.02} />
    </group>
  );
}

/* ───────────── NEXUS — orbital Genesis Engine ───────────── */
export function NexusFrame({ world, state }: FrameProps) {
  const energy = useEnergy(state, 0.6, 0.8, 1.8);
  const rings = useRef<Group>(null);
  const core = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const speed = 1 + state.hover * 0.8 + state.focus * 1.4;
    if (rings.current) {
      rings.current.rotation.set(t * 0.16 * speed, t * 0.25 * speed, t * 0.12);
      rings.current.children.forEach((ring, i) => {
        ring.rotation.x += (i % 2 ? -1 : 1) * 0.003;
      });
    }
    if (core.current) {
      core.current.rotation.set(t * 0.32, t * 0.48, t * 0.2);
      core.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.05 + state.focus * 0.12);
    }
  });
  return (
    <group>
      <group ref={rings}>
        {[4.6, 5.7, 6.8].map((radius, i) => (
          <mesh key={radius} rotation={[i * 0.9, i * 0.6, i * 0.35]}>
            <torusGeometry args={[radius, i === 1 ? 0.16 : 0.055, 8, 100]} />
            <meshBasicMaterial color={i === 1 ? world.colors.secondary : world.colors.accent} {...basic} transparent opacity={i === 1 ? 0.75 : 0.9} />
          </mesh>
        ))}
      </group>
      <group ref={core}>
        <mesh>
          <icosahedronGeometry args={[2.1, 1]} />
          <meshStandardMaterial ref={energy} color="#101832" metalness={0.85} roughness={0.2} emissive={world.colors.primary} emissiveIntensity={0.6} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[1.3, 0]} />
          <meshBasicMaterial color={world.colors.accent} {...basic} wireframe />
        </mesh>
        <pointLight color={world.colors.primary} intensity={18} distance={22} />
      </group>
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 7.7, Math.sin(angle * 2) * 1.4, Math.sin(angle) * 2]}>
            <octahedronGeometry args={[0.26 + (i % 2) * 0.12, 0]} />
            <meshBasicMaterial color={i % 2 ? world.colors.accent : world.colors.secondary} {...basic} />
          </mesh>
        );
      })}
      <RisingParticles count={55} color={world.colors.accent} area={[15, 15, 4]} size={0.13} speed={0.35} />
    </group>
  );
}

export const FRAMES: Record<string, (p: FrameProps) => React.JSX.Element> = {
  aether: AetherFrame,
  abyss: AbyssFrame,
  neoverse: NeoverseFrame,
  mythora: MythoraFrame,
  nexdrive: NexdriveFrame,
  nexus: NexusFrame,
};
