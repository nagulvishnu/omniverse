import { useEffect } from "react";
import { WORLD_IDS } from "@/config/worlds";
import { useStore } from "@/store";
import { cycleWorld, enterWorld, resetCamera, returnToHub, selectWorld } from "@/systems/navigation";
import { enterHub, skipIntro } from "@/systems/intro";
import { startTour, stopTour } from "@/systems/tour";
import { exitExplore, startExplore } from "@/systems/explore";
import { toggleFullscreen } from "@/systems/fullscreen";
import { toggleMute } from "@/systems/sound";

/** Global keyboard navigation for the whole experience. */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const onControl = !!t && (t.tagName === "BUTTON" || t.tagName === "A");
      const s = useStore.getState();

      if (s.notice) {
        if (e.code === "Escape") useStore.setState({ notice: null });
        return;
      }
      if (s.phase === "loading") return;
      if (s.phase === "intro") {
        if (e.code === "Escape" || e.code === "Space") {
          e.preventDefault();
          skipIntro();
        }
        return;
      }
      if (s.phase === "title") {
        if ((e.code === "Enter" || e.code === "Space") && !onControl) {
          e.preventDefault();
          enterHub();
        } else if (e.code === "Escape") skipIntro();
        return;
      }
      if (s.entering) return;

      if (e.code === "Escape") {
        if (s.settingsOpen) useStore.setState({ settingsOpen: false });
        else if (s.discoveryOpen) useStore.setState({ discoveryOpen: false });
        else if (s.storyOpen) useStore.setState({ storyOpen: false, focused: null, cameraMode: "overview" });
        else if (s.tourActive) stopTour(true);
        else if (s.cameraMode === "free") exitExplore();
        else if (s.focused) returnToHub();
        return;
      }
      if (s.storyOpen || s.discoveryOpen || s.cameraMode === "free") return;

      switch (e.code) {
        case "ArrowRight":
          if (!s.tourActive) cycleWorld(1);
          break;
        case "ArrowLeft":
          if (!s.tourActive) cycleWorld(-1);
          break;
        case "Enter":
          if (!onControl && s.focused && s.cameraMode === "focus") void enterWorld(s.focused);
          break;
        case "KeyT":
          startTour();
          break;
        case "KeyE":
          startExplore();
          break;
        case "KeyD":
          useStore.setState({ discoveryOpen: true, settingsOpen: false });
          break;
        case "KeyR":
        case "KeyH":
          resetCamera();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        default:
          const digit = Number(e.code.slice(5));
        if (digit >= 1 && digit <= WORLD_IDS.length) selectWorld(WORLD_IDS[digit - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
