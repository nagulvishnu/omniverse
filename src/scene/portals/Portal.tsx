import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { AdditiveBlending, Group, MathUtils, PointLight } from "three";
import type { WorldConfig } from "@/config/worlds";
import { useStore } from "@/store";
import { audio } from "@/audio/engine";
import { selectWorld } from "@/systems/navigation";
import { PORTAL_CENTER_Y, portalPosition, portalRotationY } from "../layout";
import { PortalSurface, type SurfaceHandle } from "./PortalSurface";
import { FRAMES } from "./Frames";
import { PREVIEWS } from "./Previews";
import { getDotTexture } from "../Particles";

function PortalLabel({ world }: { world: WorldConfig }) {
  const hovered = useStore((s) => s.hovered === world.id);
  const focused = useStore((s) => s.focused === world.id);
  const phase = useStore((s) => s.phase);
  const mode = useStore((s) => s.cameraMode);
  if (phase !== "hub" || focused || mode === "free" || mode === "story") return null;
  return (
    <div
      className="pointer-events-none select-none text-center transition-all duration-300"
      style={{ width: 300, transform: `scale(${hovered ? 1.12 : 1})`, opacity: hovered ? 1 : 0.82 }}
    >
      <div
        className="mx-auto inline-flex items-center gap-3 rounded-full border px-5 py-2 backdrop-blur-md"
        style={{
          borderColor: `${world.colors.primary}${hovered ? "cc" : "55"}`,
          background: "rgba(5,7,18,0.55)",
          boxShadow: hovered ? `0 0 40px ${world.colors.primary}88` : "none",
        }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: world.colors.accent, boxShadow: `0 0 12px ${world.colors.primary}` }} />
        <span className="text-[22px] font-medium tracking-[0.32em] text-white">{world.name}</span>
      </div>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: hovered ? 120 : 0, opacity: hovered ? 1 : 0, marginTop: hovered ? 10 : 0 }}
      >
        <div className="text-[14px] italic tracking-wider" style={{ color: world.colors.accent }}>
          {world.tagline}
        </div>
        <div className="mt-1 text-[13px] leading-snug text-white/75">{world.teaser}</div>
      </div>
    </div>
  );
}

export function Portal({ world }: { world: WorldConfig }) {
  const i = world.index;
  const pos = portalPosition(i);
  const state = useRef<SurfaceHandle>({ hover: 0, focus: 0 }).current;
  const preview = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const Frame = FRAMES[world.id];
  const Preview = PREVIEWS[world.id];

  useFrame((_, dt) => {
    const s = useStore.getState();
    const d = Math.min(dt, 0.05);
    const hoverT = s.hovered === world.id && s.phase === "hub" ? 1 : 0;
    const focusT = s.focused === world.id && s.phase === "hub" ? 1 : 0;
    state.hover = MathUtils.damp(state.hover, hoverT, 6, d);
    state.focus = MathUtils.damp(state.focus, focusT, 3.5, d);
    if (preview.current) {
      const sc = 0.62 + state.hover * 0.08 + state.focus * 0.3;
      preview.current.scale.setScalar(sc);
    }
    if (light.current) light.current.intensity = 30 + state.hover * 70 + state.focus * 110;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    const s = useStore.getState();
    if (s.phase !== "hub" || s.cameraMode === "free" || s.cameraMode === "story" || s.tourActive) return;
    e.stopPropagation();
    if (s.hovered !== world.id) {
      useStore.setState({ hovered: world.id });
      audio.sfx("hover");
    }
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    if (useStore.getState().hovered === world.id) useStore.setState({ hovered: null });
    document.body.style.cursor = "auto";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    const s = useStore.getState();
    if (s.phase !== "hub" || s.cameraMode === "free" || s.cameraMode === "story" || s.tourActive) return;
    e.stopPropagation();
    if (e.delta > 8) return; // was a drag
    selectWorld(world.id);
  };

  return (
    <group position={pos} rotation={[0, portalRotationY(i), 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
      {/* pedestal */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[6.4, 7.2, 0.6, 48]} />
        <meshStandardMaterial color="#0a0c18" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.63, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.3, 0.07, 6, 96]} />
        <meshBasicMaterial color={world.colors.primary} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial
          map={getDotTexture()}
          color={world.colors.primary}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <group position={[0, PORTAL_CENTER_Y, 0]}>
        <PortalSurface world={world} state={state} />
        <Frame world={world} state={state} />
        <group ref={preview} position={[0, 0, 0.9]} scale={0.62}>
          <Preview />
        </group>
        <pointLight ref={light} color={world.colors.primary} position={[0, 0, 4]} distance={34} decay={2} intensity={30} />
        <Html center position={[0, 8.9, 0]} distanceFactor={20} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <PortalLabel world={world} />
        </Html>
      </group>
    </group>
  );
}
