import { Compass, LayoutGrid, LocateFixed, Maximize, Minimize, Orbit, ScrollText, Settings, Volume2, VolumeX } from "lucide-react";
import { WORLDS, WORLD_BY_ID } from "@/config/worlds";
import { useStore } from "@/store";
import { cn } from "@/utils/cn";
import { audio } from "@/audio/engine";
import { resetCamera, returnToHub, selectWorld } from "@/systems/navigation";
import { startTour } from "@/systems/tour";
import { startExplore } from "@/systems/explore";
import { toggleFullscreen } from "@/systems/fullscreen";
import { toggleSound } from "@/systems/sound";
import { IconButton, Logo } from "./bits";

function WorldNav() {
  const focused = useStore((s) => s.focused);
  const hovered = useStore((s) => s.hovered);
  return (
    <nav aria-label="Worlds" className="glass flex items-center gap-1 rounded-full p-1">
      {WORLDS.map((w) => {
        const active = focused === w.id;
        return (
          <button
            key={w.id}
            onClick={() => selectWorld(w.id)}
            onMouseEnter={() => {
              useStore.setState({ hovered: w.id });
              audio.sfx("hover");
            }}
            onMouseLeave={() => useStore.getState().hovered === w.id && useStore.setState({ hovered: null })}
            aria-current={active}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] transition focus-visible:outline-2 focus-visible:outline-white/60 lg:px-4 lg:text-[11px]",
              active ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
            )}
          >
            <span
              className="h-2 w-2 rounded-full transition-transform"
              style={{ background: w.colors.accent, boxShadow: `0 0 10px ${w.colors.primary}`, transform: active || hovered === w.id ? "scale(1.5)" : "scale(1)" }}
            />
            {w.name}
          </button>
        );
      })}
    </nav>
  );
}

export function Hud() {
  const phase = useStore((s) => s.phase);
  const mode = useStore((s) => s.cameraMode);
  const focused = useStore((s) => s.focused);
  const tour = useStore((s) => s.tourActive);
  const story = useStore((s) => s.storyOpen);
  const discovery = useStore((s) => s.discoveryOpen);
  const settings = useStore((s) => s.settingsOpen);
  const audioOn = useStore((s) => s.audioOn);
  const muted = useStore((s) => s.muted);
  const fullscreen = useStore((s) => s.fullscreen);
  const canExplore = useStore((s) => s.canExplore);
  const mobile = useStore((s) => s.isMobile);

  if (phase !== "hub" || story) return null;
  const exploring = mode === "free";
  const panelOpen = !!focused && mode === "focus" && !tour;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* top bar */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-6">
        <Logo onClick={returnToHub} />
        <div className="hidden md:block">
          <WorldNav />
        </div>
        <div className="flex items-center gap-2">
          <IconButton label={audioOn && !muted ? "Sound on — click to turn off" : "Enable sound"} onClick={toggleSound} active={audioOn && !muted}>
            {audioOn && !muted ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </IconButton>
          <IconButton label="Settings" onClick={() => useStore.setState({ settingsOpen: !settings, discoveryOpen: false })} active={settings}>
            <Settings size={17} />
          </IconButton>
          <IconButton label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} active={fullscreen} className="hidden sm:grid">
            {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </IconButton>
          <IconButton label="Reset camera" onClick={resetCamera}>
            <LocateFixed size={17} />
          </IconButton>
        </div>
      </header>

      {/* mobile world nav */}
      <div className="pointer-events-auto absolute inset-x-0 top-[68px] flex justify-center overflow-x-auto px-3 md:hidden">
        <WorldNav />
      </div>

      {/* bottom dock */}
      {!exploring && !tour && !(mobile && panelOpen) && (
        <div
          className={cn(
            "pointer-events-auto absolute bottom-5 flex -translate-x-1/2 items-center gap-2 transition-all duration-500 sm:bottom-7",
            panelOpen ? "left-[calc(50%-12vw)] max-lg:left-1/2" : "left-1/2",
          )}
        >
          <div className="glass flex items-center gap-1 rounded-full p-1.5">
            {canExplore && !mobile && (
              <DockButton icon={<Compass size={16} />} label="Explore Hub" hint="E" onClick={startExplore} />
            )}
            <DockButton icon={<Orbit size={16} />} label="Cinematic Tour" hint="T" onClick={startTour} />
            <DockButton
              icon={<LayoutGrid size={16} />}
              label="Discover Worlds"
              hint="D"
              active={discovery}
              onClick={() => useStore.setState({ discoveryOpen: true, settingsOpen: false })}
            />
            <DockButton icon={<ScrollText size={16} />} label="Story" onClick={openStory} />
          </div>
        </div>
      )}

      {/* keyboard hint */}
      {!mobile && !exploring && !tour && (
        <div className="absolute bottom-7 right-6 hidden text-[10px] uppercase tracking-[0.22em] text-white/35 xl:block">
          {focused ? `← → switch · Enter ${WORLD_BY_ID[focused].status === "available" ? "enter world" : ""} · Esc back` : `Hover a portal · Click to focus · 1–${WORLDS.length} jump`}
        </div>
      )}
    </div>
  );
}

function openStory() {
  useStore.setState({ storyOpen: true, discoveryOpen: false, settingsOpen: false, focused: null, cameraMode: "story" });
}

function DockButton({ icon, label, hint, onClick, active }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={() => {
        audio.sfx("click");
        onClick();
      }}
      title={hint ? `${label} (${hint})` : label}
      aria-label={label}
      className={cn(
        "group flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/75 transition hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-white/60 sm:px-4 sm:text-[11px]",
        active && "bg-white/15 text-white",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
