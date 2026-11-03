import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Eye, Lock, X } from "lucide-react";
import { WORLDS, canEnter, type WorldConfig } from "@/config/worlds";
import { useStore } from "@/store";
import { cn } from "@/utils/cn";
import { enterWorld, selectWorld } from "@/systems/navigation";
import { StatusBadge, worldGradient } from "./bits";

function Card({ w, i, standalone }: { w: WorldConfig; i: number; standalone: boolean }) {
  const entering = useStore((s) => s.entering);
  const enterable = canEnter(w);
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-strong group flex flex-col overflow-hidden rounded-3xl transition duration-500 hover:-translate-y-1"
      style={{ boxShadow: `0 0 0 1px ${w.colors.primary}26` }}
    >
      <div className="relative h-44 overflow-hidden">
        <img src={w.artwork} alt={`${w.name} artwork`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a18] via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/80 backdrop-blur">
          {String(i + 1).padStart(2, "0")} · {w.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-2xl font-semibold tracking-[0.26em]" style={{ background: worldGradient(w), WebkitBackgroundClip: "text", color: "transparent" }}>
            {w.name}
          </h3>
          <p className="mt-0.5 text-[13px] italic" style={{ color: w.colors.accent }}>
            {w.tagline}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-white/70">{w.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {w.highlights.map((h) => (
            <span key={h} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10.5px] text-white/65">
              {h}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <StatusBadge status={w.status} />
        </div>
        <div className="flex gap-2">
          {!standalone && (
            <button
              onClick={() => selectWorld(w.id)}
              className="glass flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[11px] font-medium uppercase tracking-[0.2em] text-white/85 transition hover:text-white"
            >
              <Eye size={14} /> Preview
            </button>
          )}
          <button
            disabled={!enterable || !!entering}
            onClick={() => enterWorld(w.id)}
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] transition",
              enterable ? "text-white hover:brightness-110" : "cursor-not-allowed border border-white/10 bg-white/5 text-white/40",
            )}
            style={enterable ? { background: worldGradient(w) } : undefined}
          >
            {enterable ? <ExternalLink size={14} /> : <Lock size={13} />}
            {enterable ? "Enter World" : w.status === "unavailable" ? "Unavailable" : "Coming Soon"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function DiscoveryPanel({ standalone = false }: { standalone?: boolean }) {
  const open = useStore((s) => s.discoveryOpen) || standalone;
  const close = () => useStore.setState({ discoveryOpen: false });
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="discovery"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={cn("fixed inset-0 z-40 overflow-y-auto", standalone ? "bg-[radial-gradient(ellipse_at_top,#161a40,#04050d_70%)]" : "bg-[#03040a]/80 backdrop-blur-xl")}
          role="dialog"
          aria-label="World discovery"
        >
          <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-6 sm:px-10">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.4em] text-indigo-200/60">{standalone ? "OMNIVERSE · 3D unavailable" : "World Discovery"}</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[0.2em] text-white sm:text-5xl">{`${WORLDS.length} WORLDS. ONE GATEWAY.`}</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/55">
                  {standalone
                    ? "Your device can't run the 3D hub, but every world is still one click away."
                    : "Choose a reality — preview it inside the hub, or enter it directly."}
                </p>
              </div>
              {!standalone && (
                <button onClick={close} aria-label="Close discovery" className="glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/80 transition hover:text-white">
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {WORLDS.map((w, i) => (
                <Card key={w.id} w={w} i={i} standalone={standalone} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
