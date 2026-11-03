import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Lock, Sparkles } from "lucide-react";
import { WORLD_BY_ID, WORLD_IDS, canEnter, type WorldConfig } from "@/config/worlds";
import { useStore } from "@/store";
import { cn } from "@/utils/cn";
import { checkReach, cycleWorld, enterWorld, returnToHub } from "@/systems/navigation";
import { StatusBadge, worldGradient } from "./bits";

export function PreviewPanel() {
  const phase = useStore((s) => s.phase);
  const focused = useStore((s) => s.focused);
  const mode = useStore((s) => s.cameraMode);
  const tour = useStore((s) => s.tourActive);
  const discovery = useStore((s) => s.discoveryOpen);
  const story = useStore((s) => s.storyOpen);
  const visible = phase === "hub" && !!focused && mode === "focus" && !tour && !discovery && !story;

  return (
    <AnimatePresence mode="wait">
      {visible && focused && <Panel key={focused} world={WORLD_BY_ID[focused]} />}
    </AnimatePresence>
  );
}

function Panel({ world }: { world: WorldConfig }) {
  const entering = useStore((s) => s.entering);
  const reach = useStore((s) => s.reach[world.id]);
  const mobile = useStore((s) => s.isMobile);
  const enterable = canEnter(world);
  const idx = WORLD_IDS.indexOf(world.id);

  useEffect(() => {
    void checkReach(world.id);
  }, [world.id]);

  return (
    <motion.aside
      initial={mobile ? { y: 80, opacity: 0 } : { x: 60, opacity: 0 }}
      animate={mobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
      exit={mobile ? { y: 60, opacity: 0 } : { x: 40, opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="glass-strong pointer-events-auto fixed inset-x-3 bottom-3 z-30 flex max-h-[56vh] flex-col overflow-hidden rounded-3xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-24 lg:max-h-none lg:w-[min(440px,34vw)] lg:min-w-[360px]"
      style={{ boxShadow: `0 0 80px -20px ${world.colors.primary}88, inset 0 0 0 1px ${world.colors.primary}33` }}
      aria-label={`${world.name} preview`}
    >
      <div className="relative h-40 shrink-0 overflow-hidden sm:h-48 lg:h-[34%] lg:min-h-[180px]">
        <img src={world.artwork} alt={`${world.name} artwork`} className="ken-burns absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070914] via-[#070914]/30 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/80 backdrop-blur">
            {String(idx + 1).padStart(2, "0")} / {String(WORLD_IDS.length).padStart(2, "0")} · {world.category}
          </span>
        </div>
        <div className="absolute right-3 top-3 flex gap-1">
          <button onClick={() => cycleWorld(-1)} aria-label="Previous world" className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => cycleWorld(1)} aria-label="Next world" className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-3 pt-1 sm:px-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-[0.28em] sm:text-4xl" style={{ background: worldGradient(world), WebkitBackgroundClip: "text", color: "transparent" }}>
            {world.name}
          </h2>
          <p className="mt-1 text-sm italic tracking-wider" style={{ color: world.colors.accent }}>
            {world.tagline}
          </p>
        </div>
        <p className="text-[15px] leading-relaxed text-white/80">{world.description}</p>

        <div className="flex flex-wrap gap-2">
          {world.highlights.map((h) => (
            <span key={h} className="rounded-full border px-3 py-1 text-[11px] tracking-wide text-white/80" style={{ borderColor: `${world.colors.primary}55`, background: `${world.colors.primary}14` }}>
              {h}
            </span>
          ))}
        </div>

        <ul className="space-y-2.5">
          {world.features.map((f) => (
            <li key={f.label} className="flex gap-3">
              <Sparkles size={14} className="mt-1 shrink-0" style={{ color: world.colors.accent }} />
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-white">{f.label}</div>
                <div className="text-[13px] leading-snug text-white/60">{f.detail}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <StatusBadge status={world.status} />
          <span className="text-[11px] text-white/50">
            {enterable
              ? reach === "checking"
                ? "Verifying destination…"
                : reach === "ok"
                  ? "Destination verified reachable"
                  : reach === "failed"
                    ? "Destination not reachable right now"
                    : world.statusNote
              : world.statusNote}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/30">Transition · {world.transitionName}</div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 p-4 sm:p-5">
        <button
          onClick={() => returnToHub()}
          className="glass flex h-12 items-center gap-2 rounded-full px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-white/60"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Return to Hub</span>
          <span className="sm:hidden">Hub</span>
        </button>
        <button
          disabled={!enterable || !!entering}
          onClick={() => enterWorld(world.id)}
          className={cn(
            "relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full text-[12px] font-semibold uppercase tracking-[0.28em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
            enterable ? "text-white hover:scale-[1.02] hover:brightness-110" : "cursor-not-allowed border border-white/10 bg-white/5 text-white/40",
          )}
          style={enterable ? { background: worldGradient(world), boxShadow: `0 8px 40px -8px ${world.colors.primary}` } : undefined}
        >
          {entering === world.id ? <LoaderCircle size={16} className="animate-spin" /> : !enterable ? <Lock size={14} /> : null}
          {entering === world.id ? "Entering…" : enterable ? "Enter World" : world.status === "unavailable" ? "Unavailable" : "Coming Soon"}
        </button>
        <button
          disabled={!enterable || !!entering}
          onClick={() => enterWorld(world.id, true)}
          aria-label={`Open ${world.name} in a new tab`}
          title="Open in new tab"
          className="glass grid h-12 w-12 shrink-0 place-items-center rounded-full text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ExternalLink size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
