import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { WORLDS, STATUS_LABEL } from "@/config/worlds";
import { effectiveQuality, useStore, type QualitySetting } from "@/store";
import { cn } from "@/utils/cn";
import { setVolume, toggleMute, toggleSound } from "@/systems/sound";

const QUALITIES: QualitySetting[] = ["auto", "low", "medium", "high"];

function hostOf(url: string | null) {
  if (!url) return "not configured";
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

export function SettingsPanel() {
  const open = useStore((s) => s.settingsOpen && s.phase === "hub");
  const quality = useStore((s) => s.quality);
  const level = useStore((s) => effectiveQuality(s));
  const volume = useStore((s) => s.volume);
  const audioOn = useStore((s) => s.audioOn);
  const muted = useStore((s) => s.muted);
  const showFps = useStore((s) => s.showFps);
  const fps = useStore((s) => s.fps);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="glass-strong pointer-events-auto fixed right-3 top-[72px] z-40 max-h-[calc(100vh-90px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-3xl p-5 sm:right-6 sm:top-20"
          role="dialog"
          aria-label="Settings"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.3em] text-white">Settings</h3>
            <button onClick={() => useStore.setState({ settingsOpen: false })} aria-label="Close settings" className="text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <Label>Graphics quality {quality === "auto" && <em className="not-italic text-white/40">· running {level}</em>}</Label>
          <div className="mb-5 grid grid-cols-4 gap-1 rounded-full bg-white/5 p-1">
            {QUALITIES.map((q) => (
              <button
                key={q}
                onClick={() => useStore.setState({ quality: q })}
                className={cn("rounded-full py-2 text-[10px] uppercase tracking-[0.15em] transition", quality === q ? "bg-white/20 text-white" : "text-white/55 hover:text-white")}
              >
                {q}
              </button>
            ))}
          </div>

          <Label>Audio</Label>
          <div className="mb-5 space-y-3">
            <div className="flex gap-2">
              <Pill active={audioOn} onClick={toggleSound}>{audioOn ? "Sound on" : "Enable sound"}</Pill>
              <Pill active={audioOn && muted} onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</Pill>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                className="h-1 flex-1 cursor-pointer accent-indigo-300"
              />
              <span className="w-9 text-right text-[11px] tabular-nums text-white/60">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          <Label>Diagnostics</Label>
          <div className="mb-5 flex items-center justify-between">
            <Pill active={showFps} onClick={() => useStore.setState({ showFps: !showFps })}>Show FPS</Pill>
            {showFps && <span className="text-sm tabular-nums text-emerald-300">{fps} fps</span>}
          </div>

          <Label>World registry</Label>
          <ul className="space-y-1.5">
            {WORLDS.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-2 text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: w.colors.primary }} />
                  {w.name}
                </span>
                <span className="truncate text-right text-white/45">
                  {STATUS_LABEL[w.status]} · {hostOf(w.url)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10.5px] leading-relaxed text-white/35">
            Destinations are read from <code className="text-white/55">VITE_*_URL</code> variables (see .env.example). Worlds without a verified URL stay disabled.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/45">{children}</div>;
}
function Pill({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={cn("rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition", active ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/65 hover:text-white")}>
      {children}
    </button>
  );
}
