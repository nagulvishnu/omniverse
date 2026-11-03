import gsap from "gsap";
import { rt } from "@/runtime";
import { WORLD_BY_ID, type WorldId } from "@/config/worlds";

/**
 * Dimensional transition system: drives the full-screen shader overlay
 * (see scene/TransitionOverlay.tsx). Each world has its own transition.
 */
let tween: gsap.core.Tween | gsap.core.Timeline | null = null;

function arm(id: WorldId) {
  const w = WORLD_BY_ID[id];
  rt.transition.type = w.transition;
  rt.transition.color.set(w.colors.primary);
  rt.transition.color2.set(w.colors.secondary);
}

/** A quick wave that peaks and recedes — masks the camera move toward a portal. */
export function pulseTransition(id: WorldId, peak = 0.55, duration = 1.4) {
  arm(id);
  tween?.kill();
  const tl = gsap.timeline();
  tl.to(rt.transition, { progress: peak, duration: duration * 0.38, ease: "power2.in" });
  tl.to(rt.transition, { progress: 0, duration: duration * 0.62, ease: "power2.out" });
  tween = tl;
  rt.burst = 1;
}

/** Expand to full cover (used when entering a world). */
export function coverTransition(id: WorldId, duration = 1.15): Promise<void> {
  arm(id);
  tween?.kill();
  return new Promise((resolve) => {
    tween = gsap.to(rt.transition, { progress: 1, duration, ease: "power2.inOut", onComplete: () => resolve() });
  });
}

export function releaseTransition(duration = 0.9) {
  tween?.kill();
  tween = gsap.to(rt.transition, { progress: 0, duration, ease: "power2.out" });
}
