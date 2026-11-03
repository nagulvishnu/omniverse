import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, MathUtils, Vector3 } from "three";
import { WORLDS } from "@/config/worlds";
import { useStore } from "@/store";
import { rt } from "@/runtime";
import { exitExplore } from "@/systems/explore";
import { PLATFORM_RADIUS, PORTAL_RADIUS, portalPosition } from "./layout";

const EYE = 2.3;
const SPAWN = new Vector3(0, EYE, 30);
const BOUNDS = PLATFORM_RADIUS + 18;
const NEXUS_R = 6.6;
const PORTAL_R = 7.4;

/**
 * Free exploration: WASD + mouse look (pointer lock, drag fallback), Shift to
 * sprint, Space to jump, Esc to leave. Bounded, with simple circular collisions.
 */
export function ExploreController() {
  const { camera, gl } = useThree();
  const mode = useStore((s) => s.cameraMode);
  const keys = useRef(new Set<string>());
  const st = useRef({
    yaw: 0,
    pitch: 0,
    yawT: 0,
    pitchT: 0,
    vel: new Vector3(),
    vy: 0,
    y: EYE,
    blend: 0,
    dragging: false,
    wasLocked: false,
  });
  const portals = useRef(WORLDS.map((w) => portalPosition(w.index)));

  useEffect(() => {
    if (mode !== "free") return;
    const s = st.current;
    const e = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
    camera.rotation.order = "YXZ";
    s.yaw = e.y;
    s.pitch = e.x;
    s.yawT = 0;
    s.pitchT = -0.05;
    s.blend = 0;
    s.vel.set(0, 0, 0);
    s.vy = 0;
    s.y = EYE;
    s.wasLocked = false;
    const canvas = gl.domElement;
    const k = keys.current;
    k.clear();

    const down = (ev: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
        k.add(ev.code);
        if (ev.code === "Space" || ev.code.startsWith("Arrow")) ev.preventDefault();
      }
      if (ev.code === "Escape" && !document.pointerLockElement) exitExplore();
    };
    const up = (ev: KeyboardEvent) => k.delete(ev.code);
    const move = (ev: MouseEvent) => {
      if (!document.pointerLockElement && !s.dragging) return;
      s.yawT -= ev.movementX * 0.0022;
      s.pitchT = MathUtils.clamp(s.pitchT - ev.movementY * 0.0022, -1.35, 1.35);
    };
    const mdown = () => {
      if (!document.pointerLockElement) {
        s.dragging = true;
        try {
          const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
          p?.catch?.(() => undefined);
        } catch {
          /* drag fallback */
        }
      }
    };
    const mup = () => (s.dragging = false);
    const lock = () => {
      const locked = document.pointerLockElement === canvas;
      rt.pointerLocked = locked;
      useStore.setState({ explorePointer: locked });
      if (locked) s.wasLocked = true;
      else if (s.wasLocked) exitExplore();
    };
    const blur = () => k.clear();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    canvas.addEventListener("mousedown", mdown);
    window.addEventListener("mouseup", mup);
    window.addEventListener("blur", blur);
    document.addEventListener("pointerlockchange", lock);
    lock();
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      canvas.removeEventListener("mousedown", mdown);
      window.removeEventListener("mouseup", mup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("pointerlockchange", lock);
      if (document.pointerLockElement) document.exitPointerLock();
      rt.pointerLocked = false;
      useStore.setState({ explorePointer: false });
      camera.rotation.order = "XYZ";
    };
  }, [mode, camera, gl]);

  useFrame((_, dt) => {
    if (useStore.getState().cameraMode !== "free") return;
    const s = st.current;
    const d = Math.min(dt, 0.05);
    const k = keys.current;

    s.yaw = MathUtils.damp(s.yaw, s.yawT, 14, d);
    s.pitch = MathUtils.damp(s.pitch, s.pitchT, 14, d);
    // keyboard look fallback
    if (k.has("ArrowLeft")) s.yawT += 1.8 * d;
    if (k.has("ArrowRight")) s.yawT -= 1.8 * d;
    if (k.has("ArrowUp")) s.pitchT = Math.min(1.35, s.pitchT + 1.2 * d);
    if (k.has("ArrowDown")) s.pitchT = Math.max(-1.35, s.pitchT - 1.2 * d);

    camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");

    // smooth fly-in to spawn point
    s.blend += d;
    if (s.blend < 1.3) {
      camera.position.x = MathUtils.damp(camera.position.x, SPAWN.x, 4, d);
      camera.position.y = MathUtils.damp(camera.position.y, SPAWN.y, 4, d);
      camera.position.z = MathUtils.damp(camera.position.z, SPAWN.z, 4, d);
      return;
    }

    const fwd = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const side = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const speed = k.has("ShiftLeft") || k.has("ShiftRight") ? 17 : 8;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    let tx = -sin * fwd + cos * side;
    let tz = -cos * fwd - sin * side;
    const len = Math.hypot(tx, tz);
    if (len > 0) {
      tx = (tx / len) * speed;
      tz = (tz / len) * speed;
    }
    s.vel.x = MathUtils.damp(s.vel.x, tx, 9, d);
    s.vel.z = MathUtils.damp(s.vel.z, tz, 9, d);

    let x = camera.position.x + s.vel.x * d;
    let z = camera.position.z + s.vel.z * d;

    // boundary
    const r = Math.hypot(x, z);
    if (r > BOUNDS) {
      x *= BOUNDS / r;
      z *= BOUNDS / r;
    }
    // central Nexus collision
    const rn = Math.hypot(x, z);
    if (rn < NEXUS_R) {
      const k2 = NEXUS_R / Math.max(rn, 0.001);
      x = x === 0 && z === 0 ? NEXUS_R : x * k2;
      z *= k2;
    }
    // portal pedestals
    for (const p of portals.current) {
      const dx = x - p.x;
      const dz = z - p.z;
      const dd = Math.hypot(dx, dz);
      if (dd < PORTAL_R) {
        const k2 = PORTAL_R / Math.max(dd, 0.001);
        x = p.x + dx * k2;
        z = p.z + dz * k2;
      }
    }

    // jump (simple, deterministic)
    if (k.has("Space") && s.y <= EYE + 0.001) s.vy = 8.5;
    s.vy -= 24 * d;
    s.y = Math.max(EYE, s.y + s.vy * d);
    if (s.y === EYE && s.vy < 0) s.vy = 0;

    camera.position.set(x, s.y, z);
  });

  // keep the unused constant referenced for documentation of the layout
  void PORTAL_RADIUS;
  return null;
}
