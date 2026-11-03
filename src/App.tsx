import { lazy, Suspense, useEffect } from "react";
import { markLoaded, useStore } from "@/store";
import { useKeyboard } from "@/hooks/useKeyboard";
import { watchFullscreen } from "@/systems/fullscreen";
import { WORLDS } from "@/config/worlds";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { LoadingScreen } from "@/ui/LoadingScreen";
import { IntroOverlay } from "@/ui/IntroOverlay";
import { Hud } from "@/ui/Hud";
import { PreviewPanel } from "@/ui/PreviewPanel";
import { DiscoveryPanel } from "@/ui/DiscoveryPanel";
import { SettingsPanel } from "@/ui/SettingsPanel";
import { StoryOverlay } from "@/ui/StoryOverlay";
import { NoticeModal } from "@/ui/NoticeModal";
import { ExploreHud, TourBanner } from "@/ui/Overlays";

const Experience = lazy(() => import("@/scene/Experience"));

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function App() {
  const webgl = useStore((s) => s.webgl);
  const phase = useStore((s) => s.phase);

  useKeyboard();

  useEffect(() => {
    if (!detectWebGL()) {
      useStore.setState({ webgl: false });
      return;
    }
    // registry sanity: every world must have a coherent availability state
    const ok = WORLDS.every((w) => (w.status === "available") === !!w.url);
    if (ok) markLoaded("registry");
    const stopFs = watchFullscreen();
    const onResize = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      useStore.setState({ isMobile: coarse || window.innerWidth < 820 });
    };
    window.addEventListener("resize", onResize);
    return () => {
      stopFs();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!webgl) {
    return (
      <>
        <DiscoveryPanel standalone />
        <NoticeModal />
      </>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <ErrorBoundary onError={() => useStore.setState({ webgl: false })}>
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </ErrorBoundary>
      <IntroOverlay />
      <Hud />
      <PreviewPanel />
      <DiscoveryPanel />
      <SettingsPanel />
      <StoryOverlay />
      <TourBanner />
      <ExploreHud />
      {phase === "loading" && <LoadingScreen />}
      <NoticeModal />
    </div>
  );
}
