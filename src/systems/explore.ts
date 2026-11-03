import { audio } from "@/audio/engine";
import { rt } from "@/runtime";
import { useStore } from "@/store";
import { stopTour } from "./tour";

/** Explore mode lifecycle (movement itself lives in scene/ExploreController.tsx). */

export function startExplore() {
  const s = useStore.getState();
  if (s.phase !== "hub" || !s.canExplore || s.entering) return;
  if (s.tourActive) stopTour(false);
  useStore.setState({
    cameraMode: "free",
    focused: null,
    discoveryOpen: false,
    settingsOpen: false,
    storyOpen: false,
  });
  audio.setWorld(null);
  audio.sfx("click");
  const canvas = document.getElementById("omni-canvas");
  // Pointer lock for mouse-look. If it is refused we fall back to drag-to-look.
  try {
    const p = (canvas as HTMLElement | null)?.requestPointerLock?.() as Promise<void> | undefined;
    p?.catch?.(() => undefined);
  } catch {
    /* fallback to drag look */
  }
}

export function exitExplore(toOverview = true) {
  if (document.pointerLockElement) document.exitPointerLock();
  rt.pointerLocked = false;
  if (useStore.getState().cameraMode === "free") {
    useStore.setState({ cameraMode: toOverview ? "overview" : "focus" });
  }
}
