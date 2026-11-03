import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
} from "three";
import { WORLDS } from "@/config/worlds";
import { effectiveQuality, markLoaded, useStore } from "@/store";
import { rt } from "@/runtime";
import { NOISE_GLSL, OUTPUT_GLSL } from "@/shaders/common";
import { GalaxyBillboard } from "./Galaxy";
import { RisingParticles, getDotTexture } from "./Particles";
import { QUALITY } from "./quality";
import { NEXUS_Y, PLATFORM_RADIUS, PORTAL_RADIUS, portalPosition } from "./layout";

const dummy = new Object3D();
const ss = MathUtils.smoothstep;

/* ───────────── floor energy shader: rings, grid, pathways flowing to every portal ───────────── */
const FLOOR_VERT = /* glsl */ `
varying vec2 vP;
void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FLOOR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vP;
uniform float uTime, uBurst;
          uniform vec3 uCols[${WORLDS.length}];
${NOISE_GLSL}
void main(){
  vec2 p = vP;
  float r = length(p);
  float edge = smoothstep(${PLATFORM_RADIUS}.0, ${PLATFORM_RADIUS - 6}.0, r);
  float rl = abs(fract(r/3.0) - 0.5);
  float ring = smoothstep(0.485, 0.5, rl);
  float pulse = pow(0.5 + 0.5*sin(r*0.35 - uTime*1.4), 5.0);
  vec2 g = abs(fract(p/2.0) - 0.5);
  float grid = smoothstep(0.485, 0.5, max(g.x,g.y)) * 0.16;
  vec3 col = vec3(0.25,0.35,0.8) * (ring*0.35 + ring*pulse*1.2 + grid);
  col += vec3(0.4,0.5,1.0) * exp(-r*0.22) * (0.5 + 0.5*uBurst);
  for(int i=0; i < ${WORLDS.length}; i++){
    float ai = -1.5707963 + float(i)*${(Math.PI * 2 / WORLDS.length).toFixed(7)};
    vec2 dir = vec2(cos(ai), -sin(ai));
    vec2 nrm = vec2(-dir.y, dir.x);
    float along = dot(p,dir), perp = dot(p,nrm);
    float inside = smoothstep(4.0,6.0,along) * smoothstep(${PORTAL_RADIUS + 1}.0, ${PORTAL_RADIUS - 3}.0, along);
    float w = smoothstep(0.7, 0.15, abs(perp));
    float core = smoothstep(0.12, 0.0, abs(perp));
    float flow = pow(0.5 + 0.5*sin(along*0.7 - uTime*3.0 + float(i)), 3.0);
    float sparkle = step(0.97, hash21(vec2(floor(along*2.0 - uTime*6.0), float(i)))) * w;
    col += uCols[i] * inside * (w*0.25 + w*flow*0.8 + core*1.2 + sparkle*2.0);
    // landing pad glow
    float pad = smoothstep(7.0, 0.0, length(p - dir*${PORTAL_RADIUS}.0));
    col += uCols[i] * pad * 0.5;
  }
  col *= edge;
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}`;

function FloorFX() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uBurst: { value: 0 },
          uCols: { value: WORLDS.map((w) => new Color(w.colors.primary)) },
        },
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uBurst.value = rt.burst;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={2}>
      <circleGeometry args={[PLATFORM_RADIUS, 96]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

/* ───────────── platform ───────────── */
function Platform({ reflector }: { reflector: boolean }) {
  const rim = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (rim.current) rim.current.rotation.y = clock.elapsedTime * 0.05;
  });
  return (
    <group>
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[PLATFORM_RADIUS + 0.8, PLATFORM_RADIUS - 6, 1.4, 96]} />
        <meshStandardMaterial color="#05060e" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <circleGeometry args={[PLATFORM_RADIUS, 96]} />
        {reflector ? (
          <MeshReflectorMaterial
            color="#04050c"
            metalness={0.6}
            roughness={0.7}
            mirror={0.55}
            blur={[260, 80]}
            mixBlur={1}
            mixStrength={1.4}
            resolution={512}
            depthScale={0.8}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.4}
          />
        ) : (
          <meshStandardMaterial color="#05060e" metalness={0.85} roughness={0.28} />
        )}
      </mesh>
      <FloorFX />
      <group ref={rim}>
        {[PLATFORM_RADIUS + 0.3, PLATFORM_RADIUS - 4.5].map((r, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <torusGeometry args={[r, i ? 0.05 : 0.14, 8, 160]} />
            <meshBasicMaterial color={i ? "#5a7bff" : "#9a4dff"} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ───────────── outer colonnade (instanced) ───────────── */
function Colonnade({ count }: { count: number }) {
  const shafts = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const a = shafts.current;
    const b = caps.current;
    if (!a || !b) return;
    const col = new Color();
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + 0.03;
      const h = 3 + ((i * 7) % 5) * 1.3;
      const r = PLATFORM_RADIUS + 3.2;
      dummy.position.set(Math.cos(ang) * r, h / 2 - 0.6, Math.sin(ang) * r);
      dummy.rotation.set(0, -ang, 0);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);
      dummy.position.y = h - 0.5;
      dummy.scale.set(1.25, 0.18, 1.25);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      b.setColorAt(i, col.set(WORLDS[i % WORLDS.length].colors.primary));
    }
    a.instanceMatrix.needsUpdate = true;
    b.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  }, [count]);
  return (
    <group>
      <instancedMesh key={`s${count}`} ref={shafts} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[0.9, 1, 0.9]} />
        <meshStandardMaterial color="#0b0e1c" metalness={0.9} roughness={0.3} />
      </instancedMesh>
      <instancedMesh key={`c${count}`} ref={caps} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ───────────── floating architecture (instanced) ───────────── */
function Floaters({ count }: { count: number }) {
  const a = useRef<InstancedMesh>(null);
  const b = useRef<InstancedMesh>(null);
  const nA = Math.ceil(count * 0.6);
  const nB = count - nA;
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const ang = Math.random() * Math.PI * 2;
        const r = 50 + Math.random() * 70;
        return {
          x: Math.cos(ang) * r,
          y: 5 + Math.random() * 55,
          z: Math.sin(ang) * r,
          s: 1.2 + Math.random() * 4.5,
          sp: 0.05 + Math.random() * 0.2,
          ph: Math.random() * 10,
          i,
        };
      }),
    [count],
  );
  useLayoutEffect(() => {
    const col = new Color();
    const pal = WORLDS.map((w) => w.colors.secondary);
    [a.current, b.current].forEach((m, k) => {
      if (!m) return;
      const n = k ? nB : nA;
      for (let i = 0; i < n; i++) m.setColorAt(i, col.set(pal[(i + k) % WORLDS.length]));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [nA, nB]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const A = a.current;
    const B = b.current;
    if (!A || !B) return;
    data.forEach((d, i) => {
      const m = i < nA ? A : B;
      const idx = i < nA ? i : i - nA;
      dummy.position.set(d.x, d.y + Math.sin(t * 0.3 + d.ph) * 1.5, d.z);
      dummy.rotation.set(t * d.sp + d.ph, t * d.sp * 1.3, d.ph);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      m.setMatrixAt(idx, dummy.matrix);
    });
    A.instanceMatrix.needsUpdate = true;
    B.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh key={`fa${nA}`} ref={a} args={[undefined, undefined, nA]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#10142c" metalness={0.9} roughness={0.25} emissive="#2a2f7a" emissiveIntensity={0.6} flatShading />
      </instancedMesh>
      <instancedMesh key={`fb${nB}`} ref={b} args={[undefined, undefined, nB]} frustumCulled={false}>
        <torusGeometry args={[1, 0.08, 6, 32]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ───────────── cosmos: stars, nebulae, planets ───────────── */
function Cosmos({ density }: { density: number }) {
  const stars = useMemo(() => {
    const n = Math.floor(3200 * density);
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const col = new Color();
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = 700 + Math.random() * 200;
      const s = Math.sqrt(1 - u * u);
      p.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3);
      col.setHSL(0.55 + Math.random() * 0.2, 0.5, 0.6 + Math.random() * 0.4);
      c.set([col.r, col.g, col.b], i * 3);
    }
    return { p, c };
  }, [density]);
  const ref = useRef<Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004;
  });
  return (
    <group>
      <points ref={ref} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars.p, 3]} />
          <bufferAttribute attach="attributes-color" args={[stars.c, 3]} />
        </bufferGeometry>
        <pointsMaterial size={2.4} sizeAttenuation={false} vertexColors map={getDotTexture()} transparent depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false} alphaTest={0.01} />
      </points>
      <GalaxyBillboard position={[-380, 150, -520]} size={420} a="#7a5cff" b="#2a6bff" type={1} seed={2} opacity={0.9} />
      <GalaxyBillboard position={[420, 90, -460]} size={380} a="#ff5ad8" b="#3a2aff" type={1} seed={7} opacity={0.7} />
      <GalaxyBillboard position={[60, 220, 520]} size={340} a="#2fd0ff" b="#6a3dff" type={1} seed={11} opacity={0.6} />
      <GalaxyBillboard position={[-260, 330, -180]} size={220} a="#b9c8ff" b="#6a7cff" type={0} seed={3} tilt={0.5} />
      <mesh position={[-300, 70, -480]}>
        <sphereGeometry args={[46, 40, 28]} />
        <meshStandardMaterial color="#2b2060" emissive="#3a2a8a" emissiveIntensity={0.7} roughness={1} fog={false} />
      </mesh>
      <group position={[340, 140, -520]} rotation={[0.4, 0, 0.3]}>
        <mesh>
          <sphereGeometry args={[30, 32, 24]} />
          <meshStandardMaterial color="#6a3a24" emissive="#8a4a28" emissiveIntensity={0.6} roughness={1} fog={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[42, 70, 80]} />
          <meshBasicMaterial color="#d9a679" side={DoubleSide} transparent opacity={0.35} fog={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────── central landmark: THE NEXUS ───────────── */
function Nexus() {
  const root = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  const orbs = useRef<Group>(null);
  const beam = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const glow = useRef<Sprite>(null);
  const light = useRef<PointLight>(null);

  const beamMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uA: { value: new Color("#8fa6ff") }, uB: { value: new Color("#c07dff") } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `precision highp float; varying vec2 vUv; uniform float uTime; uniform vec3 uA,uB; ${NOISE_GLSL}
          void main(){
            float h = vUv.y;
            float f = 0.6 + 0.4*fbm(vec2(vUv.x*8.0, h*10.0 - uTime*2.5));
            float a = pow(1.0-abs(h-0.5)*2.0*0.0, 1.0) * smoothstep(0.0,0.02,h) * (1.0-smoothstep(0.55,1.0,h)) * f;
            vec3 c = mix(uA,uB,h);
            gl_FragColor = vec4(c*a*0.55, 1.0);
            ${OUTPUT_GLSL}
          }`,
      }),
    [],
  );
  useEffect(() => () => beamMat.dispose(), [beamMat]);
  const glowMat = useMemo(
    () =>
      new SpriteMaterial({
        map: getDotTexture(),
        color: "#cfd8ff",
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        transparent: true,
      }),
    [],
  );
  useEffect(() => () => glowMat.dispose(), [glowMat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const it = rt.introT;
    const reveal = ss(it, 0.12, 0.55);
    const rs = Math.max(0.001, reveal);
    if (rings.current) {
      rings.current.scale.setScalar(rs);
      rings.current.children.forEach((c, i) => {
        c.rotation.x = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1) + i;
        c.rotation.y = t * (0.18 + i * 0.1) + i * 1.3;
      });
    }
    if (core.current) {
      core.current.scale.set(rs * 1.2, rs * 2.1, rs * 1.2);
      core.current.rotation.y = t * 0.5;
      (core.current.material as MeshBasicMaterial).color.setHSL(0.6 + Math.sin(t * 0.3) * 0.08, 0.7, 0.75);
    }
    if (inner.current) {
      inner.current.scale.setScalar(rs * 1.6);
      inner.current.rotation.set(t * 0.7, -t * 0.9, 0);
    }
    if (orbs.current) {
      orbs.current.scale.setScalar(rs);
      orbs.current.rotation.y = t * 0.4;
      orbs.current.children.forEach((o, i) => (o.position.y = Math.sin(t * 1.2 + i * 1.3) * 1.2));
    }
    if (beam.current) {
      const bs = Math.max(0.001, ss(it, 0.08, 0.5));
      beam.current.scale.set(1, bs, 1);
      beam.current.position.y = NEXUS_Y + 90 * bs;
      beamMat.uniforms.uTime.value = t;
    }
    if (halo.current) {
      const hs = Math.max(0.001, ss(it, 0.1, 0.55));
      halo.current.scale.set(1, hs, 1);
      halo.current.position.y = NEXUS_Y + 90 * hs;
    }
    if (glow.current) {
      const bump = ss(it, 0.06, 0.4) * (1 - ss(it, 0.5, 0.95));
      const base = 0.5 + 8 * ss(it, 0, 0.1) + 120 * bump * bump + 9 * Math.sin(t * 1.5) * 0.15 * ss(it, 0.9, 1);
      glow.current.scale.setScalar(base);
      glowMat.opacity = ss(it, 0, 0.03) * (0.55 + 0.45 * (1 - bump * 0.4));
    }
    if (light.current) light.current.intensity = (260 + rt.burst * 500) * reveal;
    if (root.current) root.current.position.y = Math.sin(t * 0.5) * 0.25;
  });

  return (
    <group>
      {/* base tiers */}
      {[
        [5.8, 0.5, 0.25],
        [4.6, 0.5, 0.75],
        [3.4, 0.7, 1.35],
      ].map(([r, h, y], i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[r - 0.4, r, h, 48]} />
          <meshStandardMaterial color="#080a18" metalness={0.95} roughness={0.22} emissive="#3a4aff" emissiveIntensity={0.18} />
        </mesh>
      ))}
      <mesh position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.4, 0.08, 8, 96]} />
        <meshBasicMaterial color="#7a8cff" toneMapped={false} />
      </mesh>
      {/* spire */}
      <mesh position={[0, 4.6, 0]}>
        <coneGeometry args={[1.0, 6.4, 6]} />
        <meshStandardMaterial color="#0a0d1e" metalness={0.95} roughness={0.2} emissive="#2a38c8" emissiveIntensity={0.3} flatShading />
      </mesh>
      <group ref={root} position={[0, NEXUS_Y, 0]}>
        <mesh ref={core}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#cfd8ff" toneMapped={false} />
        </mesh>
        <mesh ref={inner}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" wireframe toneMapped={false} />
        </mesh>
        <group ref={rings}>
          {[3.4, 4.6, 5.8].map((r, i) => (
            <mesh key={i}>
              <torusGeometry args={[r, 0.07 + i * 0.015, 8, 120]} />
              <meshBasicMaterial color={WORLDS[(i * 2) % WORLDS.length].colors.primary} toneMapped={false} />
            </mesh>
          ))}
        </group>
        <group ref={orbs}>
          {WORLDS.map((w, i) => {
            const a = (i / WORLDS.length) * Math.PI * 2;
            return (
              <mesh key={w.id} position={[Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6]}>
                <sphereGeometry args={[0.28, 14, 10]} />
                <meshBasicMaterial color={w.colors.accent} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
        <pointLight ref={light} color="#a9b8ff" distance={70} decay={2} intensity={260} />
        <sprite ref={glow} material={glowMat} />
      </group>
      {/* light shaft to the heavens */}
      <mesh ref={beam} position={[0, NEXUS_Y + 90, 0]}>
        <cylinderGeometry args={[0.18, 0.4, 180, 24, 1, true]} />
        <primitive object={beamMat} attach="material" />
      </mesh>
      <mesh ref={halo} position={[0, NEXUS_Y + 90, 0]}>
        <cylinderGeometry args={[0.9, 1.6, 180, 24, 1, true]} />
        <meshBasicMaterial color="#7a8cff" transparent opacity={0.05} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ───────────── lighting ───────────── */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#8a96ff" />
      <directionalLight position={[20, 40, 25]} intensity={0.9} color="#b4c2ff" />
      <directionalLight position={[-25, 15, -30]} intensity={0.5} color="#b07dff" />
      <Environment resolution={64} frames={1} environmentIntensity={0.9}>
        <Lightformer form="ring" intensity={5} color="#7a8cff" position={[0, 12, -10]} scale={16} />
        <Lightformer form="rect" intensity={3} color="#c07dff" position={[-14, 4, 6]} scale={[10, 6, 1]} rotation-y={Math.PI / 3} />
        <Lightformer form="rect" intensity={3} color="#39b6ff" position={[14, 4, 6]} scale={[10, 6, 1]} rotation-y={-Math.PI / 3} />
        <Lightformer form="circle" intensity={2} color="#ffffff" position={[0, 25, 0]} scale={10} rotation-x={Math.PI / 2} />
      </Environment>
    </>
  );
}

/** Ground-level fog haze ring so the platform edge dissolves into the void */
function Atmosphere({ q }: { q: number }) {
  return (
    <>
      <RisingParticles count={Math.floor(520 * q)} color="#9fb4ff" area={[100, 44, 100]} position={[0, 20, 0]} size={0.3} speed={0.35} wobble={0.4} opacity={0.6} />
      {WORLDS.map((w, i) => {
        const p = portalPosition(i);
        return <RisingParticles key={w.id} count={Math.floor(60 * q)} color={w.colors.primary} area={[9, 14, 9]} position={[p.x, 7, p.z]} size={0.22} speed={0.9} wobble={0.2} opacity={0.8} />;
      })}
    </>
  );
}

export function Hub() {
  const level = useStore((s) => effectiveQuality(s));
  const q = QUALITY[level];
  useEffect(() => {
    markLoaded("hub");
  }, []);
  return (
    <group>
      <fogExp2 attach="fog" args={["#04050d", 0.011]} />
      <color attach="background" args={["#000000"]} />
      <Lighting />
      <Platform reflector={q.reflector} />
      <Nexus />
      <Colonnade count={q.pillars} />
      <Floaters count={q.floaters} />
      <Cosmos density={q.particles} />
      <Atmosphere q={q.particles} />
    </group>
  );
}
