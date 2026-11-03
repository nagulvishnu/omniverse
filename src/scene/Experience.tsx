import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { MathUtils } from "three";
import { effectiveQuality, markLoaded, useStore } from "@/store";
import { NEXUS_Y } from "./layout";
import { QUALITY } from "./quality";
import { Hub } from "./Hub";
import { Portals } from "./portals/Portals";
import { IntroCorridor } from "./IntroCorridor";
import { CameraRig } from "./CameraRig";
import { ExploreController } from "./ExploreController";
import { TransitionOverlay } from "./TransitionOverlay";
import { Effects } from "./Effects";
import { rt } from "@/runtime";
import { useState } from "react";

/** Signals asset readiness (real shader compilation) to the loading screen. */
function LoadSignal() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    markLoaded("webgl");
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      const done = () => !cancelled && markLoaded("shaders");
      gl.compileAsync(scene, camera).then(done, done);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [gl, scene, camera]);
  return null;
}

/** FPS probe + burst decay */
function FrameStats() {
  const acc = useRef({ n: 0, t: 0 });
  useFrame((_, dt) => {
    rt.burst = MathUtils.damp(rt.burst, 0, 1.6, Math.min(dt, 0.05));
    const a = acc.current;
    a.n++;
    a.t += dt;
    if (a.t >= 0.5) {
      if (useStore.getState().showFps) useStore.setState({ fps: Math.round(a.n / a.t) });
      a.n = 0;
      a.t = 0;
    }
  });
  return null;
}

export default function Experience() {
  const level = useStore((s) => effectiveQuality(s));
  const mode = useStore((s) => s.quality);
  const q = QUALITY[level];
  const [factor, setFactor] = useState(1);
  const dpr = Math.min(window.devicePixelRatio || 1, MathUtils.lerp(q.dprMin, q.dprMax, factor));

  return (
    <Canvas
      flat
      dpr={dpr}
      camera={{ fov: 50, near: 0.1, far: 2500, position: [0, NEXUS_Y, 420] }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.domElement.id = "omni-canvas";
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          useStore.setState({
            notice: {
              tone: "error",
              title: "Graphics context lost",
              message: "The GPU reset the 3D view. Reload to re-enter the hub — the world discovery menu still works.",
              actions: [{ label: "Reload", run: () => window.location.reload() }],
            },
          });
        });
      }}
    >
      <PerformanceMonitor
        flipflops={4}
        onChange={({ factor: f }) => setFactor(f)}
        onDecline={() => {
          if (mode !== "auto") return;
          const s = useStore.getState();
          useStore.setState({ autoLevel: s.autoLevel === "high" ? "medium" : "low" });
        }}
        onIncline={() => {
          if (mode !== "auto") return;
          const s = useStore.getState();
          const cap = s.isMobile ? "medium" : "high";
          const next = s.autoLevel === "low" ? "medium" : "high";
          useStore.setState({ autoLevel: next === "high" && cap === "medium" ? "medium" : next });
        }}
      />
      <Hub />
      <Portals />
      <IntroCorridor />
      <CameraRig />
      <ExploreController />
      <TransitionOverlay />
      <Effects />
      <FrameStats />
      <LoadSignal />
    </Canvas>
  );
}
