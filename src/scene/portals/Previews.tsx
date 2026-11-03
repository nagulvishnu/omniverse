import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Object3D,
  Points,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
} from "three";
import { RisingParticles, getDotTexture } from "../Particles";

/**
 * Lightweight, procedural miniature "preview scenes" that live inside each
 * portal. Instancing + shared geometry keep draw calls low.
 */

const basic = { toneMapped: false } as const;
const dummy = new Object3D();

/* ═══════════════ AETHER ═══════════════ */
export function AetherPreview() {
  const galaxy = useRef<Points>(null);
  const planetA = useRef<Group>(null);
  const planetB = useRef<Group>(null);
  const disc = useRef<Group>(null);
  const { gPos, gCol, sPos } = useMemo(() => {
    const n = 1100;
    const gp = new Float32Array(n * 3);
    const gc = new Float32Array(n * 3);
    const c1 = new Color("#ffd6ff");
    const c2 = new Color("#5a7bff");
    for (let i = 0; i < n; i++) {
      const arm = i % 3;
      const r = Math.pow(Math.random(), 0.7) * 2.2;
      const a = r * 2.4 + arm * 2.094 + (Math.random() - 0.5) * 0.6;
      gp[i * 3] = Math.cos(a) * r;
      gp[i * 3 + 1] = (Math.random() - 0.5) * 0.15 * (1.2 - r / 2.2);
      gp[i * 3 + 2] = Math.sin(a) * r;
      const c = c1.clone().lerp(c2, r / 2.2);
      gc.set([c.r, c.g, c.b], i * 3);
    }
    const sp = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      const v = new Object3D();
      v.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 1.4);
      sp.set([v.position.x, v.position.y, v.position.z], i * 3);
    }
    return { gPos: gp, gCol: gc, sPos: sp };
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (galaxy.current) galaxy.current.rotation.y = t * 0.2;
    if (planetA.current) planetA.current.rotation.y = t * 0.15;
    if (planetB.current) planetB.current.position.set(-1.9 + Math.cos(t * 0.5) * 0.35, -1.7 + Math.sin(t * 0.5) * 0.25, 0.6);
    if (disc.current) disc.current.rotation.z = t * 0.9;
  });
  return (
    <group>
      <points ref={galaxy} position={[-1.5, 1.5, 0]} rotation={[0.95, 0, 0.3]} scale={0.8}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[gPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[gCol, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.075} vertexColors map={getDotTexture()} transparent depthWrite={false} blending={AdditiveBlending} {...basic} alphaTest={0.01} />
      </points>
      <group ref={planetA} position={[1.7, 0.5, 0.4]} rotation={[0.3, 0, 0.35]}>
        <mesh>
          <sphereGeometry args={[0.95, 32, 24]} />
          <meshStandardMaterial color="#d98a4e" emissive="#5a2b10" emissiveIntensity={0.7} roughness={0.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.12, 2, 64]} />
          <meshBasicMaterial color="#ffd9a8" {...basic} transparent opacity={0.8} />
        </mesh>
      </group>
      <group ref={planetB}>
        <mesh>
          <sphereGeometry args={[0.38, 24, 18]} />
          <meshStandardMaterial color="#45d0c5" emissive="#0b5a60" emissiveIntensity={0.8} />
        </mesh>
      </group>
      <group position={[0.1, -0.7, 0.9]}>
        <mesh>
          <sphereGeometry args={[0.42, 24, 18]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <group ref={disc} rotation={[1.2, 0.2, 0]}>
          <mesh>
            <torusGeometry args={[0.78, 0.12, 6, 64]} />
            <meshBasicMaterial color="#ffb066" {...basic} />
          </mesh>
          <mesh>
            <torusGeometry args={[1.05, 0.05, 6, 64]} />
            <meshBasicMaterial color="#ff6a3d" {...basic} transparent opacity={0.8} />
          </mesh>
        </group>
      </group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sPos, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.09} color="#ffffff" map={getDotTexture()} transparent depthWrite={false} {...basic} alphaTest={0.01} />
      </points>
    </group>
  );
}

/* ═══════════════ ABYSS ═══════════════ */
function Jelly({ x, y, z, color, phase }: { x: number; y: number; z: number; color: string; phase: number }) {
  const g = useRef<Group>(null);
  const tent = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (g.current) {
      g.current.position.y = y + Math.sin(t * 0.9) * 0.5;
      const s = 1 + Math.sin(t * 1.8) * 0.08;
      g.current.scale.set(s, 1 / s, s);
    }
    tent.current?.children.forEach((c, i) => (c.rotation.z = Math.sin(t * 2 + i) * 0.18));
  });
  return (
    <group ref={g} position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={color} {...basic} transparent opacity={0.65} side={DoubleSide} />
      </mesh>
      <group ref={tent}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32]}>
              <mesh position={[0, -0.55, 0]}>
                <cylinderGeometry args={[0.012, 0.02, 1.1, 4]} />
                <meshBasicMaterial color={color} {...basic} transparent opacity={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

export function AbyssPreview() {
  const whale = useRef<Group>(null);
  const tail = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (whale.current) {
      whale.current.position.x = Math.sin(t * 0.25) * 1.4;
      whale.current.position.y = 0.2 + Math.sin(t * 0.5) * 0.25;
      whale.current.rotation.y = Math.cos(t * 0.25) > 0 ? 0 : Math.PI;
      whale.current.rotation.z = Math.sin(t * 0.5) * 0.06;
    }
    if (tail.current) tail.current.rotation.z = Math.sin(t * 1.8) * 0.28;
  });
  return (
    <group>
      <group ref={whale} scale={0.85}>
        <mesh scale={[1.9, 0.62, 0.68]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#4a7fb5" emissive="#10345e" emissiveIntensity={0.8} roughness={0.6} />
        </mesh>
        <mesh position={[-0.2, -0.45, 0]} scale={[1.4, 0.3, 0.6]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color="#c9dcec" emissive="#1c3c58" emissiveIntensity={0.6} />
        </mesh>
        <group ref={tail} position={[-1.8, 0, 0]}>
          <mesh position={[-0.5, 0.05, 0]} scale={[0.9, 0.22, 0.26]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#44729f" emissive="#10345e" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[-1.05, 0.12, 0]} rotation={[0, 0, 0.1]} scale={[0.28, 0.06, 0.95]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#3d6a96" emissive="#10345e" emissiveIntensity={0.7} />
          </mesh>
        </group>
        <mesh position={[0.5, -0.45, 0.62]} rotation={[0.6, 0, -0.6]} scale={[0.6, 0.07, 0.22]}>
          <sphereGeometry args={[1, 10, 6]} />
          <meshStandardMaterial color="#3d6a96" emissive="#10345e" />
        </mesh>
        <mesh position={[1.6, 0.15, 0.4]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#e8fbff" {...basic} />
        </mesh>
      </group>
      <Jelly x={-2.4} y={1.7} z={0.6} color="#ff7de0" phase={0} />
      <Jelly x={2.3} y={2.3} z={0.2} color="#7dfbe0" phase={2} />
      <Jelly x={-0.4} y={-1.6} z={1.0} color="#8aa6ff" phase={4} />
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={i} position={[-3.2 + i * 0.54, -3.1 + (i % 3) * 0.16, 0.1 + (i % 4) * 0.25]} rotation={[0, 0, ((i % 5) - 2) * 0.12]}>
          <coneGeometry args={[0.16 + (i % 3) * 0.07, 0.8 + (i % 4) * 0.35, 6]} />
          <meshStandardMaterial color={i % 2 ? "#ff6fae" : "#17c8b4"} emissive={i % 2 ? "#a01f63" : "#0b7d78"} emissiveIntensity={1} />
        </mesh>
      ))}
      <RisingParticles count={50} color="#bff6ff" area={[6.5, 7.5, 2.5]} size={0.14} speed={0.7} wobble={0.4} opacity={0.7} />
    </group>
  );
}

/* ═══════════════ NEOVERSE ═══════════════ */
function windowTexture() {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#06091a";
  g.fillRect(0, 0, 32, 64);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 8; x++) {
      if (Math.random() > 0.45) {
        g.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
        g.fillRect(x * 4 + 1, y * 4 + 1, 2, 2);
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function NeoversePreview() {
  const towers = useRef<InstancedMesh>(null);
  const cars = useRef<InstancedMesh>(null);
  const tex = useMemo(() => windowTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const N = 38;
  const carData = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        y: -1.2 + (i % 5) * 0.95,
        z: -0.8 + (i % 3) * 0.9,
        speed: (0.5 + (i % 4) * 0.25) * (i % 2 ? 1 : -1),
        off: i * 1.7,
      })),
    [],
  );
  useLayoutEffect(() => {
    const m = towers.current;
    if (!m) return;
    const cols = ["#2f9bff", "#b44dff", "#7ff1ff", "#ff5ad8", "#5a7bff"];
    const c = new Color();
    for (let i = 0; i < N; i++) {
      const gx = (i % 10) * 0.66 - 3.0;
      const gz = Math.floor(i / 10) * 0.85 - 1.2;
      const h = 1.2 + Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * 4.2;
      dummy.position.set(gx + ((i * 7) % 3) * 0.08, -3.3 + h / 2, gz);
      dummy.scale.set(0.5, h, 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.set(cols[i % cols.length]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    const cm = cars.current;
    if (cm) {
      const cc = new Color();
      carData.forEach((_, i) => cm.setColorAt(i, cc.set(i % 2 ? "#ffe08a" : "#ff6aa8")));
      if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
    }
  }, [carData]);
  useFrame(({ clock }) => {
    const m = cars.current;
    if (!m) return;
    const t = clock.elapsedTime;
    carData.forEach((c, i) => {
      const x = ((((t * c.speed + c.off) % 8) + 8) % 8) - 4;
      dummy.position.set(x, c.y, c.z);
      dummy.scale.set(0.5, 0.08, 0.14);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={towers} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial map={tex} {...basic} />
      </instancedMesh>
      <instancedMesh ref={cars} args={[undefined, undefined, carData.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial {...basic} />
      </instancedMesh>
      {[-3.28, -3.22].map((y, i) => (
        <mesh key={i} position={[0, y, 0.3]}>
          <boxGeometry args={[8, 0.03, 3]} />
          <meshBasicMaterial color={i ? "#b44dff" : "#2f9bff"} {...basic} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════ MYTHORA ═══════════════ */
function Tree({ x, y, z, s }: { x: number; y: number; z: number; s: number }) {
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.4, 5]} />
        <meshStandardMaterial color="#3b2a1e" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.32, 0.9, 6]} />
        <meshStandardMaterial color="#1fb88a" emissive="#0a6a56" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.22, 0.6, 6]} />
        <meshStandardMaterial color="#35e0a8" emissive="#0f8a6a" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

export function MythoraPreview() {
  const castle = useRef<Group>(null);
  const dragon = useRef<Group>(null);
  const body = useRef<Group>(null);
  const wingL = useRef<Group>(null);
  const wingR = useRef<Group>(null);
  const wingGeo = useMemo(() => {
    const s = new Shape();
    s.moveTo(0, 0);
    s.lineTo(-0.5, 1.1);
    s.lineTo(-0.15, 0.85);
    s.lineTo(0.15, 1.2);
    s.lineTo(0.35, 0.6);
    s.lineTo(0.5, 0);
    s.closePath();
    return new ShapeGeometry(s);
  }, []);
  useEffect(() => () => wingGeo.dispose(), [wingGeo]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (castle.current) castle.current.position.y = 0.2 + Math.sin(t * 0.7) * 0.18;
    if (dragon.current) {
      const a = t * 0.55;
      dragon.current.position.set(Math.cos(a) * 2.8, 1.6 + Math.sin(a * 2) * 0.5, Math.sin(a) * 1.4 + 0.8);
      dragon.current.rotation.y = -a - Math.PI / 2 + Math.PI;
    }
    const flap = Math.sin(t * 5) * 0.7;
    if (wingL.current) wingL.current.rotation.x = -0.3 - flap;
    if (wingR.current) wingR.current.rotation.x = 0.3 + flap;
    body.current?.children.forEach((c, i) => (c.position.y = Math.sin(t * 4 - i * 0.7) * 0.07));
  });
  return (
    <group>
      <group ref={castle} position={[0, 0.2, 0]}>
        <mesh position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[1.4, 1.9, 8]} />
          <meshStandardMaterial color="#5a4466" roughness={1} emissive="#1c1228" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[1.4, 1.4, 0.16, 8]} />
          <meshStandardMaterial color="#2fb27e" emissive="#0e5a3e" emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.9, 1.1, 0.9]} />
          <meshStandardMaterial color="#d8c8f0" emissive="#6a4aa8" emissiveIntensity={0.6} />
        </mesh>
        {[
          [-0.55, -0.5, 1.5],
          [0.55, 0.5, 1.2],
          [0, 0, 2.0],
        ].map(([x, z, h], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, h / 2 * 0.6 + 0.1, 0]}>
              <cylinderGeometry args={[0.2, 0.22, h * 0.6, 8]} />
              <meshStandardMaterial color="#e6d8ff" emissive="#6a4aa8" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, h * 0.6 + 0.4, 0]}>
              <coneGeometry args={[0.3, 0.55, 8]} />
              <meshStandardMaterial color="#ffc247" emissive="#a86a10" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))}
        <Tree x={-0.95} y={0.1} z={0.5} s={0.55} />
        <Tree x={0.95} y={0.1} z={-0.4} s={0.6} />
      </group>
      <group position={[-2.4, -1.9, 0.6]}>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.9, 0.7, 7]} />
          <meshStandardMaterial color="#4a3a56" emissive="#1c1228" />
        </mesh>
        <Tree x={-0.25} y={0.02} z={0} s={0.8} />
        <Tree x={0.25} y={0.02} z={0.2} s={0.6} />
        <Tree x={0.05} y={0.02} z={-0.3} s={0.7} />
      </group>
      <group ref={dragon} scale={0.8}>
        <group ref={body}>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[-i * 0.28, 0, 0]} scale={1 - i * 0.08}>
              <sphereGeometry args={[0.2, 10, 8]} />
              <meshStandardMaterial color="#ffc247" emissive="#a86a10" emissiveIntensity={1} />
            </mesh>
          ))}
        </group>
        <mesh position={[0.3, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.16, 0.45, 6]} />
          <meshStandardMaterial color="#ffd77a" emissive="#a86a10" emissiveIntensity={1} />
        </mesh>
        <group ref={wingL} position={[-0.4, 0.1, 0.1]}>
          <mesh geometry={wingGeo} rotation={[-Math.PI / 2, 0, 0]} scale={1.3}>
            <meshBasicMaterial color="#8a3dff" {...basic} side={DoubleSide} transparent opacity={0.85} />
          </mesh>
        </group>
        <group ref={wingR} position={[-0.4, 0.1, -0.1]} rotation={[0, Math.PI, 0]}>
          <mesh geometry={wingGeo} rotation={[-Math.PI / 2, 0, 0]} scale={1.3}>
            <meshBasicMaterial color="#8a3dff" {...basic} side={DoubleSide} transparent opacity={0.85} />
          </mesh>
        </group>
      </group>
      <RisingParticles count={60} color="#ffe9a8" area={[7, 7, 3]} size={0.12} speed={0.4} />
    </group>
  );
}

/* ═══════════════ NEXDRIVE ═══════════════ */
export function NexdrivePreview() {
  const car = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const wheels = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (car.current) car.current.rotation.y = t * 0.5;
    wheels.current?.children.forEach((w) => (w.rotation.z -= dt * 4));
    rings.current?.children.forEach((r, i) => {
      const z = ((((t * 2.4 + i * 1.3) % 6) + 6) % 6) - 5;
      r.position.z = z;
      r.scale.setScalar(0.6 + (z + 5) * 0.12);
    });
  });
  const wheelPos: [number, number][] = [
    [1.0, 0.72],
    [1.0, -0.72],
    [-1.05, 0.72],
    [-1.05, -0.72],
  ];
  return (
    <group position={[0, -0.8, 0]}>
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[2.6, 2.7, 0.14, 48]} />
        <meshStandardMaterial color="#10141f" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.47, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.04, 6, 64]} />
        <meshBasicMaterial color="#39b6ff" {...basic} />
      </mesh>
      <group ref={car} position={[0, 0.05, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[3.2, 0.42, 1.35]} />
          <meshStandardMaterial color="#cfd8e6" metalness={0.95} roughness={0.2} emissive="#1a2a40" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[1.2, 0.0, 0]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[1.1, 0.3, 1.3]} />
          <meshStandardMaterial color="#cfd8e6" metalness={0.95} roughness={0.2} emissive="#1a2a40" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.2, 0.42, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
          <boxGeometry args={[1.45, 0.38, 1.0]} />
          <meshStandardMaterial color="#0a1018" metalness={1} roughness={0.08} emissive="#0a2a4a" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[-1.55, 0.2, 0]}>
          <boxGeometry args={[0.2, 0.2, 1.2]} />
          <meshStandardMaterial color="#cfd8e6" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[1.72, 0.1, 0]}>
          <boxGeometry args={[0.05, 0.07, 1.1]} />
          <meshBasicMaterial color="#9fe6ff" {...basic} />
        </mesh>
        <mesh position={[-1.62, 0.1, 0]}>
          <boxGeometry args={[0.05, 0.07, 1.15]} />
          <meshBasicMaterial color="#ff3a4a" {...basic} />
        </mesh>
        <group ref={wheels}>
          {wheelPos.map(([x, z], i) => (
            <mesh key={i} position={[x, -0.2, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.36, 0.36, 0.3, 20]} />
              <meshStandardMaterial color="#12161f" metalness={0.6} roughness={0.5} emissive="#39b6ff" emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, 1.5]} />
          <meshBasicMaterial color="#39b6ff" {...basic} transparent opacity={0.35} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <group ref={rings} position={[0, 1.0, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i}>
            <torusGeometry args={[3.2, 0.03, 6, 64]} />
            <meshBasicMaterial color={i % 2 ? "#e8f6ff" : "#39b6ff"} {...basic} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export const PREVIEWS: Record<string, () => React.JSX.Element> = {
  aether: AetherPreview,
  abyss: AbyssPreview,
  neoverse: NeoversePreview,
  mythora: MythoraPreview,
  nexdrive: NexdrivePreview,
};
