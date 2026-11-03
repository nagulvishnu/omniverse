import { audio } from "@/audio/engine";
import { canEnter, WORLD_BY_ID, WORLD_IDS, type WorldId } from "@/config/worlds";
import { useStore } from "@/store";
import { coverTransition, pulseTransition, releaseTransition } from "./transition";
import { stopTour } from "./tour";
import { exitExplore } from "./explore";

/**
 * Portal interaction controller + world navigation + availability logic.
 */

export function selectWorld(id: WorldId) {
  const s = useStore.getState();
  if (s.phase !== "hub" || s.entering) return;
  if (s.tourActive) stopTour(false);
  if (s.cameraMode === "free") exitExplore(false);
  const changed = s.focused !== id || s.cameraMode !== "focus";
  useStore.setState({
    focused: id,
    cameraMode: "focus",
    discoveryOpen: false,
    settingsOpen: false,
  });
  if (changed) {
    pulseTransition(id);
    audio.sfx("select");
    audio.setWorld(id);
  }
  void checkReach(id);
}

export function cycleWorld(dir: 1 | -1) {
  const { focused } = useStore.getState();
  const cur = focused ? WORLD_IDS.indexOf(focused) : dir === 1 ? -1 : 0;
  const next = (cur + dir + WORLD_IDS.length) % WORLD_IDS.length;
  selectWorld(WORLD_IDS[next]);
}

export function returnToHub() {
  const s = useStore.getState();
  if (s.entering) return;
  if (s.tourActive) stopTour(false);
  if (s.cameraMode === "free") exitExplore(false);
  const had = s.focused;
  useStore.setState({ focused: null, cameraMode: "overview", discoveryOpen: false, storyOpen: false });
  if (had) {
    audio.sfx("back");
    audio.setWorld(null);
    pulseTransition(had, 0.35, 1.1);
  }
}

export function resetCamera() {
  returnToHub();
  useStore.setState({ cameraMode: "overview", focused: null });
}

/* ───────── availability / reachability ───────── */

const PROBE_TIMEOUT = 7000;

/** Lightweight HEAD probe (no-cors → opaque response means the host answered). */
export async function probeUrl(url: string, timeout = PROBE_TIMEOUT): Promise<{ ok: boolean; reason?: string }> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeout);
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: ctrl.signal, redirect: "follow" });
    return { ok: true };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, reason: aborted ? "The website took too long to respond." : "The website could not be reached." };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkReach(id: WorldId) {
  const w = WORLD_BY_ID[id];
  const s = useStore.getState();
  if (!canEnter(w) || !w.url) return;
  if (s.reach[id] === "checking" || s.reach[id] === "ok") return;
  useStore.setState((st) => ({ reach: { ...st.reach, [id]: "checking" } }));
  const r = await probeUrl(w.url);
  useStore.setState((st) => ({ reach: { ...st.reach, [id]: r.ok ? "ok" : "failed" } }));
}

/**
 * Enter a world: availability gate → dimensional transition → reachability
 * verification → real navigation (same tab by default).
 * Never navigates to a missing / invalid / unreachable destination.
 */
export async function enterWorld(id: WorldId, newTab = false) {
  const w = WORLD_BY_ID[id];
  const s = useStore.getState();
  if (s.entering) return;

  if (!canEnter(w) || !w.url) {
    useStore.setState({
      notice: {
        tone: "info",
        title: `${w.name} — ${w.status === "unavailable" ? "Unavailable" : "Coming Soon"}`,
        message: w.statusNote,
      },
    });
    return;
  }

  const url = w.url;
  // Pre-open a tab synchronously so popup blockers allow it
  let tab: Window | null = null;
  if (newTab) {
    tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
  }

  useStore.setState({ entering: id });
  audio.sfx("activate");
  const probe = probeUrl(url);
  if (!newTab) await coverTransition(id);
  const r = await probe;

  if (!r.ok) {
    tab?.close();
    useStore.setState((st) => ({ entering: null, reach: { ...st.reach, [id]: "failed" } }));
    releaseTransition();
    useStore.setState({
      notice: {
        tone: "error",
        title: `${w.name} can't be reached right now`,
        message: `${r.reason ?? "The destination did not respond."} OMNIVERSE will not send you to a broken page. You can try again in a moment.`,
        actions: [{ label: "Retry", run: () => void enterWorld(id, newTab) }],
      },
    });
    return;
  }

  useStore.setState((st) => ({ reach: { ...st.reach, [id]: "ok" } }));
  if (newTab) {
    if (tab) tab.location.href = url;
    else window.open(url, "_blank", "noopener");
    useStore.setState({ entering: null });
    return;
  }
  window.location.assign(url);
  // If the page is restored from bfcache, reset state
  window.setTimeout(() => {
    useStore.setState({ entering: null });
    releaseTransition();
  }, 4000);
}
