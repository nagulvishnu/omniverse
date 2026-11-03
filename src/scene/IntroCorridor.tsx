import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  PointsMaterial,
} from "three";
import { useStore } from "@/store";
import { rt } from "@/runtime";
import { WORLDS } from "@/config/worlds";
import { GalaxyBillboard } from "./Galaxy";
import { getDotTexture } from "./Particles";

const dummy = new Object3D();
const ss = MathUtils.smoothstep;
const PAL = ["#4f6bff", "#9a4dff", "#2fd0ff", "#ff5ad8", "#ffc247"];

/**
 * The introduction corridor: cosmic particles, energy streams, floating
 * geometry, dimensional gateways, massive architecture and distant galaxies —
 * all strung along the camera's flight path toward the hub. Unmounted once the
 * visitor enters the hub, freeing its GPU resources.
 */
function Corridor() {
  const gates = useRef<Group>(null);
  const floaters = useRef<InstancedMesh>(null);
  const NF = 70;

  const mats = useMemo(
    () => ({
      points: new PointsMaterial({ size: 1.1, vertexColors: true, map: getDotTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, toneMapped: false, alphaTest: 0.01, opacity: 0 }),
      lines: new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, opacity: 0 }),
      wire: new MeshBasicMaterial({ wireframe: true, transparent: true, fog: false, toneMapped: false, opacity: 0 }),
      gateA: new MeshBasicMaterial({ color: "#7a8cff", transparent: true, fog: false, toneMapped: false, opacity: 0 }),
      gateB: new MeshBasicMaterial({ color: "#c07dff", transparent: true, fog: false, toneMapped: false, opacity: 0 }),
      slab: new LineBasicMaterial({ color: "#5a6cff", transparent: true, fog: false, toneMapped: false, opacity: 0 }),
      slabFill: new MeshBasicMaterial({ color: "#02030a", transparent: true, fog: false, opacity: 0 }),
    }),
    [],
  );

  const { pPos, pCol, lPos, lCol, slabs, slabEdges } = useMemo(() => {
    const n = 2600;
    const pp = new Float32Array(n * 3);
    const pc = new Float32Array(n * 3);
    const c = new Color();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.pow(Math.random(), 0.7) * 75;
      pp.set([Math.cos(a) * r, Math.sin(a) * r * 0.7 + 8, 40 + Math.random() * 400], i * 3);
      c.set(PAL[i % PAL.length]).multiplyScalar(0.6 + Math.random() * 0.7);
      pc.set([c.r, c.g, c.b], i * 3);
    }
    const m = 280;
    const lp = new Float32Array(m * 6);
    const lc = new Float32Array(m * 6);
    for (let i = 0; i < m; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 9 + Math.random() * 45;
      const z = 50 + Math.random() * 380;
      const len = 6 + Math.random() * 26;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.7 + 8;
      lp.set([x, y, z, x, y, z + len], i * 6);
      c.set(PAL[i % 3]);
      lc.set([c.r, c.g, c.b, 0, 0, 0], i * 6);
    }
    const sl = Array.from({ length: 14 }, (_, i) => ({
      x: (i % 2 ? 1 : -1) * (38 + (i * 13) % 30),
      z: 110 + i * 22,
      h: 70 + ((i * 29) % 60),
      w: 5 + (i % 3) * 2.5,
    }));
    const edges = new EdgesGeometry(new BoxGeometry(1, 1, 1));
    return { pPos: pp, pCol: pc, lPos: lp, lCol: lc, slabs: sl, slabEdges: edges };
  }, []);

  const floatData = useMemo(
    () =>
      Array.from({ length: NF }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 14 + Math.random() * 46;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 + 8, z: 60 + Math.random() * 370, s: 1 + Math.random() * 3.5, sp: 0.1 + Math.random() * 0.4 };
      }),
    [],
  );

  useLayoutEffect(() => {
    const m = floaters.current;
    if (!m) return;
    const c = new Color();
    for (let i = 0; i < NF; i++) m.setColorAt(i, c.set(PAL[i % PAL.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      slabEdges.dispose();
    },
    [mats, slabEdges],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const o = ss(rt.introT, 0.1, 0.4);
    mats.points.opacity = o;
    mats.lines.opacity = o * 0.8;
    mats.wire.opacity = o * 0.75;
    mats.gateA.opacity = o;
    mats.gateB.opacity = o * 0.9;
    mats.slab.opacity = o * 0.9;
    mats.slabFill.opacity = o;
    gates.current?.children.forEach((g, i) => {
      g.rotation.z = t * 0.15 * (i % 2 ? -1 : 1) + i;
      g.children[1].rotation.z = -t * 0.3;
    });
    const m = floaters.current;
    if (m) {
      floatData.forEach((d, i) => {
        dummy.position.set(d.x, d.y + Math.sin(t * 0.4 + i) * 1.2, d.z);
        dummy.rotation.set(t * d.sp, t * d.sp * 0.7, i);
        dummy.scale.setScalar(d.s);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <points material={mats.points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[pCol, 3]} />
        </bufferGeometry>
      </points>
      <lineSegments material={mats.lines} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[lCol, 3]} />
        </bufferGeometry>
      </lineSegments>
      <instancedMesh ref={floaters} args={[undefined, undefined, NF]} material={mats.wire} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>
      {/* dimensional gateways */}
      <group ref={gates}>
        {[372, 318, 262, 208, 156, 104].map((z, i) => (
          <group key={z} position={[0, 10 + (i % 2) * 2, z]}>
            <mesh material={mats.gateA}>
              <torusGeometry args={[16 + i * 2.2, 0.35, 8, 96]} />
            </mesh>
            <mesh material={mats.gateB}>
              <torusGeometry args={[13 + i * 1.6, 0.14, 6, 96, Math.PI * 1.5]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* massive architecture */}
      {slabs.map((s, i) => (
        <group key={i} position={[s.x, s.h / 2 - 12, s.z]} scale={[s.w, s.h, s.w]}>
          <mesh material={mats.slabFill}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <lineSegments geometry={slabEdges} material={mats.slab} />
        </group>
      ))}
      {/* distant galaxies */}
      <GalaxyBillboard position={[-120, 45, 330]} size={170} a="#7a5cff" b="#2a6bff" seed={4} introFade />
      <GalaxyBillboard position={[130, -10, 270]} size={140} a="#ff5ad8" b="#4a2aff" seed={9} introFade />
      <GalaxyBillboard position={[0, 70, 440]} size={360} a={WORLDS[1].colors.primary} b="#6a3dff" type={1} seed={5} opacity={0.8} introFade />
    </group>
  );
}

export function IntroCorridor() {
  const phase = useStore((s) => s.phase);
  if (phase === "hub") return null;
  return <Corridor />;
}
