import gsap from "gsap";
import { audio } from "@/audio/engine";
import { rt } from "@/runtime";
import { useStore } from "@/store";

/** Cinematic introduction — a GSAP timeline driving rt.introT (camera + structure reveal). */
let tl: gsap.core.Timeline | null = null;
let skipped = false;

const CAPTIONS: [number, string][] = [
  [1.0, "Before everything, there was a single point of light."],
  [3.4, "It unfolded into a structure beyond measure."],
  [5.8, "Five gateways. Five realities."],
];

export function startIntro() {
  skipped = false;
  rt.introT = 0;
  useStore.setState({ phase: "intro", cameraMode: "intro", introCaption: "" });
  tl?.kill();
  tl = gsap.timeline();
  CAPTIONS.forEach(([t, text]) => tl!.call(() => useStore.setState({ introCaption: text }), [], t));
  tl.call(() => useStore.setState({ introCaption: "" }), [], 7.7);
  tl.to(rt, { introT: 1, duration: 9, ease: "none" }, 0);
  tl.call(() => {
    if (skipped) {
      enterHub();
    } else {
      useStore.setState({ phase: "title", introCaption: "" });
    }
  }, [], 9);
}

/** Fast-forward through the intro, then go straight into the hub. */
export function skipIntro() {
  const s = useStore.getState();
  if (s.phase === "hub" || skipped) return;
  skipped = true;
  useStore.setState({ introCaption: "" });
  if (s.phase === "title" || !tl) {
    enterHub();
    return;
  }
  tl.timeScale(9);
}

export function enterHub() {
  tl?.kill();
  tl = null;
  gsap.to(rt, { introT: 1, duration: 0.4 });
  rt.burst = 1;
  audio.sfx("activate");
  useStore.setState({ phase: "hub", cameraMode: "overview", introCaption: "" });
}
