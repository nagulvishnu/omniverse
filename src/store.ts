import { create } from "zustand";
import type { WorldId } from "@/config/worlds";

export type Phase = "loading" | "intro" | "title" | "hub";
export type CameraMode = "intro" | "overview" | "focus" | "free" | "tour" | "story";
export type QualitySetting = "auto" | "low" | "medium" | "high";
export type QualityLevel = "low" | "medium" | "high";
export type Reach = "unknown" | "checking" | "ok" | "failed";

export interface Notice {
  title: string;
  message: string;
  tone: "info" | "error";
  actions?: { label: string; run: () => void }[];
}

export const LOAD_STAGES: { key: string; label: string }[] = [
  { key: "webgl", label: "Initialising renderer" },
  { key: "registry", label: "Validating world registry" },
  { key: "hub", label: "Constructing the central hub" },
  { key: "portals", label: "Opening five dimensional portals" },
  { key: "shaders", label: "Compiling portal shaders" },
];

const isCoarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
const isSmall = typeof window !== "undefined" && window.innerWidth < 820;

interface State {
  phase: Phase;
  cameraMode: CameraMode;
  focused: WorldId | null;
  hovered: WorldId | null;
  loaded: Record<string, boolean>;
  webgl: boolean;
  isMobile: boolean;
  canExplore: boolean;

  quality: QualitySetting;
  autoLevel: QualityLevel;
  showFps: boolean;
  fps: number;

  audioOn: boolean;
  muted: boolean;
  volume: number;

  discoveryOpen: boolean;
  settingsOpen: boolean;
  storyOpen: boolean;
  tourActive: boolean;
  tourIndex: number;
  introCaption: string;
  entering: WorldId | null;
  notice: Notice | null;
  reach: Record<WorldId, Reach>;
  fullscreen: boolean;
  explorePointer: boolean;
}

export const useStore = create<State>(() => ({
  phase: "loading",
  cameraMode: "intro",
  focused: null,
  hovered: null,
  loaded: {},
  webgl: true,
  isMobile: isCoarse || isSmall,
  canExplore: !isCoarse,

  quality: "auto",
  autoLevel: isCoarse || isSmall ? "low" : "medium",
  showFps: false,
  fps: 60,

  audioOn: false,
  muted: false,
  volume: 0.6,

  discoveryOpen: false,
  settingsOpen: false,
  storyOpen: false,
  tourActive: false,
  tourIndex: 0,
  introCaption: "",
  entering: null,
  notice: null,
  reach: { aether: "unknown", abyss: "unknown", neoverse: "unknown", mythora: "unknown", nexdrive: "unknown" },
  fullscreen: false,
  explorePointer: false,
}));

export const effectiveQuality = (s: Pick<State, "quality" | "autoLevel">): QualityLevel =>
  s.quality === "auto" ? s.autoLevel : s.quality;

export function markLoaded(key: string) {
  if (!useStore.getState().loaded[key]) {
    useStore.setState((s) => ({ loaded: { ...s.loaded, [key]: true } }));
  }
}
