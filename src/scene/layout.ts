import { Vector3 } from "three";
import { WORLDS } from "@/config/worlds";

export const PORTAL_RADIUS = 22;
export const PORTAL_CENTER_Y = 6;
export const PLATFORM_RADIUS = 34;
export const NEXUS_Y = 11;

export function portalAngle(i: number, count: number = WORLDS.length) {
  return -Math.PI / 2 + (i * Math.PI * 2) / count;
}
export function portalDir(i: number) {
  const a = portalAngle(i);
  return new Vector3(Math.cos(a), 0, Math.sin(a));
}
export function portalPosition(i: number) {
  return portalDir(i).multiplyScalar(PORTAL_RADIUS);
}
/** Portals face the central Nexus. */
export function portalRotationY(i: number) {
  const a = portalAngle(i);
  return Math.atan2(-Math.cos(a), -Math.sin(a));
}

export interface RigTarget {
  pos: Vector3;
  look: Vector3;
}

const UP = new Vector3(0, 1, 0);
const f = new Vector3();
const r = new Vector3();

/**
 * Camera pose that frames portal `i` from inside the ring.
 * `shift` offsets the framing so the portal sits beside the preview panel
 * (desktop: panel on right → portal left; mobile: bottom sheet → portal up).
 */
export function focusRig(i: number, out: RigTarget, opts: { mobile: boolean; shift: boolean; sway: number }) {
  const d = portalDir(i);
  const p = portalPosition(i);
  out.pos.copy(d).multiplyScalar(PORTAL_RADIUS - 16);
  out.pos.y = 7.2;
  out.look.copy(p);
  out.look.y = PORTAL_CENTER_Y - 0.2;
  // gentle sway (cinematic drift)
  r.set(-d.z, 0, d.x);
  out.pos.addScaledVector(r, opts.sway * 2.2);
  out.pos.y += Math.abs(opts.sway) * 0.6;
  if (opts.shift) {
    f.copy(out.look).sub(out.pos).normalize();
    r.crossVectors(f, UP).normalize();
    if (opts.mobile) out.look.y -= 6.2;
    else out.look.addScaledVector(r, 4.4);
  }
  return out;
}
