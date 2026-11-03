import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { useStore, type CameraMode } from "@/store";
import { WORLD_IDS } from "@/config/worlds";
import { rt } from "@/runtime";
import { NEXUS_Y, focusRig, type RigTarget } from "./layout";

const ss = MathUtils.smoothstep;
const mk = (): RigTarget => ({ pos: new Vector3(), look: new Vector3() });

/**
 * Cinematic hub camera: overview · portal focus · tour · story · intro.
 * (Free camera is handled by ExploreController.)
 */
export function CameraRig() {
  const { camera, size, pointer } = useThree();
  const look = useRef(new Vector3(0, NEXUS_Y, 0));
  const prev = useRef<CameraMode>("intro");
  const tmp = useRef(new Vector3());
  const target = useMemo(() => mk(), []);
  const nodes = useMemo(() => Array.from({ length: WORLD_IDS.length + 4 }, mk), []);

  useFrame((state, dt) => {
    const cam = camera as PerspectiveCamera;
    const s = useStore.getState();
    const mode = s.cameraMode;
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const aspect = size.width / size.height;
    const wide = Math.max(0, 1.15 - aspect);
    const fov = 50 + Math.min(wide * 40, 38);
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = MathUtils.damp(cam.fov, fov, 6, d);
      cam.updateProjectionMatrix();
    }
    const fit = 1 + wide * 0.55;

    const overview = (out: RigTarget, high = false) => {
      const sway = Math.sin(t * 0.07) * 0.5;
      const R = (high ? 58 : 46) * fit;
      out.pos.set(Math.sin(sway) * R, (high ? 34 : 24) + Math.sin(t * 0.15) * 1.2, Math.cos(sway) * R);
      out.look.set(0, high ? 2 : 5, 0);
    };

    if (mode === "free") {
      cam.getWorldDirection(tmp.current);
      look.current.copy(cam.position).addScaledVector(tmp.current, 20);
      prev.current = mode;
      return;
    }

    if (mode === "intro") {
      const it = rt.introT;
      const e = it * it * (3 - 2 * it);
      const R = 46 * fit;
      cam.position.set(Math.sin(it * 5) * 4 * (1 - it), MathUtils.lerp(NEXUS_Y, 24, ss(it, 0.55, 1)), MathUtils.lerp(420, R, e));
      look.current.set(0, MathUtils.lerp(NEXUS_Y, 5, ss(it, 0.6, 1)), 0);
      cam.lookAt(look.current);
      prev.current = mode;
      return;
    }

    let lambda = 2.4;
    const shift = !s.tourActive;
    if (mode === "focus" && s.focused) {
      focusRig(WORLD_IDS.indexOf(s.focused), target, { mobile: s.isMobile, shift, sway: Math.sin(t * 0.3) * 0.35 });
    } else if (mode === "tour") {
      if (s.focused) focusRig(WORLD_IDS.indexOf(s.focused), target, { mobile: s.isMobile, shift: false, sway: Math.sin(t * 0.45) * 1.2 });
      else overview(target, true);
      lambda = 1.7;
    } else if (mode === "story") {
      // keyframed camera path scrubbed by ScrollTrigger
      nodes[0].pos.set(0, NEXUS_Y, 330);
      nodes[0].look.set(0, NEXUS_Y, 0);
      nodes[1].pos.set(0, 22, 72 * fit);
      nodes[1].look.set(0, 8, 0);
      nodes[2].pos.set(0, 46, 64 * fit);
      nodes[2].look.set(0, 0, 0);
      for (let i = 0; i < WORLD_IDS.length; i++) focusRig(i, nodes[3 + i], { mobile: s.isMobile, shift: s.isMobile, sway: 0 });
      const finalNode = WORLD_IDS.length + 3;
      nodes[finalNode].pos.set(0, 24, 46 * fit);
      nodes[finalNode].look.set(0, 5, 0);
      const segments = WORLD_IDS.length + 3;
      const p = MathUtils.clamp(rt.storyP, 0, 1) * segments;
      const i = Math.min(segments - 1, Math.floor(p));
      const f = ss(p - i, 0.3, 0.8);
      target.pos.lerpVectors(nodes[i].pos, nodes[i + 1].pos, f);
      target.look.lerpVectors(nodes[i].look, nodes[i + 1].look, f);
      lambda = 3.4;
    } else {
      overview(target);
    }

    if (!s.isMobile && (mode === "overview" || mode === "focus")) {
      target.pos.x += pointer.x * 2.2;
      target.pos.y += pointer.y * 1.2;
    }

    if (prev.current === "free" || prev.current === "intro") lambda = 2.0;
    cam.position.x = MathUtils.damp(cam.position.x, target.pos.x, lambda, d);
    cam.position.y = MathUtils.damp(cam.position.y, target.pos.y, lambda, d);
    cam.position.z = MathUtils.damp(cam.position.z, target.pos.z, lambda, d);
    look.current.x = MathUtils.damp(look.current.x, target.look.x, lambda * 1.2, d);
    look.current.y = MathUtils.damp(look.current.y, target.look.y, lambda * 1.2, d);
    look.current.z = MathUtils.damp(look.current.z, target.look.z, lambda * 1.2, d);
    cam.lookAt(look.current);
    prev.current = mode;
  });
  return null;
}
