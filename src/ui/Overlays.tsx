import { motion } from "framer-motion";
import { LocateFixed, Square, X } from "lucide-react";
import { WORLDS } from "@/config/worlds";
import { useStore } from "@/store";
import { returnToHub } from "@/systems/navigation";
import { stopTour } from "@/systems/tour";
import { exitExplore } from "@/systems/explore";

/** Caption + progress shown during the automatic cinematic tour. */
export function TourBanner() {
  const active = useStore((s) => s.tourActive);
  const idx = useStore((s) => s.tourIndex);
  const focused = useStore((s) => s.focused);
  const w = focused ? WORLDS[idx] : null;
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center px-4">
      <div className="glass-strong pointer-events-auto flex w-[min(560px,100%)] items-center gap-5 rounded-3xl p-4 pl-6">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">
            Cinematic tour {w ? `· ${String(idx + 1).padStart(2, "0")} / ${String(WORLDS.length).padStart(2, "0")}` : "· establishing"}
          </div>
          {w ? (
            <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mt-1 text-2xl font-semibold tracking-[0.25em]" style={{ color: w.colors.accent }}>
                {w.name}
              </div>
              <div className="truncate text-[13px] italic text-white/70">{w.tagline}</div>
            </motion.div>
          ) : (
            <div className="mt-1 text-lg tracking-[0.2em] text-white/80">OMNIVERSE</div>
          )}
          <div className="mt-3 h-0.5 overflow-hidden rounded bg-white/10">
            {w && <div key={w.id} className="h-full origin-left bg-white/70" style={{ animation: "tour-progress 5.2s linear forwards" }} />}
          </div>
        </div>
        <button onClick={() => stopTour(true)} className="glass flex h-11 items-center gap-2 rounded-full px-4 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:text-white">
          <Square size={12} /> Stop
        </button>
      </div>
    </div>
  );
}

/** Controls reminder + exit while in free exploration. */
export function ExploreHud() {
  const mode = useStore((s) => s.cameraMode);
  const locked = useStore((s) => s.explorePointer);
  if (mode !== "free") return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 px-4">
        <div className="glass pointer-events-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-3xl px-6 py-3 text-[10.5px] uppercase tracking-[0.2em] text-white/70">
          <Key k="W A S D">Move</Key>
          <Key k="Mouse">Look</Key>
          <Key k="Shift">Sprint</Key>
          <Key k="Space">Jump</Key>
          <Key k="Esc">Exit</Key>
          <button onClick={() => exitExplore()} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
            <X size={12} /> Exit
          </button>
          <button onClick={returnToHub} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
            <LocateFixed size={12} /> Reset camera
          </button>
        </div>
        {!locked && <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">Click the view to capture the mouse — or drag to look · arrow keys also turn</div>}
      </div>
    </div>
  );
}

function Key({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <kbd className="rounded-md border border-white/25 bg-white/10 px-2 py-0.5 font-sans text-[10px] text-white">{k}</kbd>
      {children}
    </span>
  );
}
