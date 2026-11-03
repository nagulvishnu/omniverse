import { Color } from "three";

/**
 * Mutable per-frame state shared between GSAP timelines, React Three Fiber
 * and the DOM. Kept outside React state to avoid re-rendering at 60 fps.
 */
export const rt = {
  /** 0..1 progress of the cinematic intro (1 = finished) */
  introT: 0,
  /** 0..1 progress of the scroll storytelling camera path */
  storyP: 0,
  /** full-screen dimensional transition */
  transition: { progress: 0, type: 0, color: new Color("#4f6bff"), color2: new Color("#9a4dff") },
  /** a smoothed "energy burst" that makes the hub flare on activation */
  burst: 0,
  pointerLocked: false,
};
