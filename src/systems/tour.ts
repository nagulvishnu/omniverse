import { audio } from "@/audio/engine";
import { WORLD_IDS } from "@/config/worlds";
import { useStore } from "@/store";
import { pulseTransition } from "./transition";

/** Cinematic tour: automatically visits each portal, then returns to the overview. */
let timer: number | undefined;
const DWELL_MS = 5200;

function step(i: number) {
  if (!useStore.getState().tourActive) return;
  if (i >= WORLD_IDS.length) {
    stopTour(true);
    return;
  }
  const id = WORLD_IDS[i];
  useStore.setState({ focused: id, tourIndex: i, cameraMode: "tour" });
  pulseTransition(id, 0.45, 1.3);
  audio.sfx("transition");
  audio.setWorld(id);
  timer = window.setTimeout(() => step(i + 1), DWELL_MS);
}

export function startTour() {
  const s = useStore.getState();
  if (s.phase !== "hub" || s.entering) return;
  window.clearTimeout(timer);
  useStore.setState({
    tourActive: true,
    focused: null,
    cameraMode: "tour",
    discoveryOpen: false,
    settingsOpen: false,
    storyOpen: false,
  });
  audio.sfx("click");
  // brief establishing overview, then first portal
  timer = window.setTimeout(() => step(0), 1600);
}

export function stopTour(returnToOverview = true) {
  window.clearTimeout(timer);
  if (!useStore.getState().tourActive) return;
  useStore.setState(
    returnToOverview
      ? { tourActive: false, focused: null, cameraMode: "overview" }
      : { tourActive: false },
  );
  if (returnToOverview) audio.setWorld(null);
}
