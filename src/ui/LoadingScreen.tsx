import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LOAD_STAGES, useStore } from "@/store";
import { startIntro } from "@/systems/intro";
import { LogoMark } from "./bits";

/** Real progress: each stage flips when the actual resource finished. */
export function LoadingScreen() {
  const loaded = useStore((s) => s.loaded);
  const done = LOAD_STAGES.filter((s) => loaded[s.key]).length;
  const target = done / LOAD_STAGES.length;
  const [shown, setShown] = useState(0);
  const [minTime, setMinTime] = useState(false);
  const current = LOAD_STAGES.find((s) => !loaded[s.key]);

  useEffect(() => {
    const id = window.setTimeout(() => setMinTime(true), 1300);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((p) => (p < target ? Math.min(target, p + 0.02) : p));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const ready = shown >= 1 && minTime;
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(startIntro, 750);
    return () => window.clearTimeout(id);
  }, [ready]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: ready ? 0 : 1 }}
      transition={{ duration: 0.6, delay: ready ? 0.1 : 0 }}
      style={{ pointerEvents: ready ? "none" : "auto" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex w-[min(360px,80vw)] flex-col items-center">
        <div className="animate-[spin_14s_linear_infinite]">
          <LogoMark size={64} />
        </div>
        <div className="mt-6 text-[22px] font-semibold tracking-[0.5em] text-white">OMNIVERSE</div>
        <div className="mt-1 text-[10px] tracking-[0.35em] text-white/40">ONE GATEWAY. INFINITE EXPERIENCES.</div>
        <div className="mt-10 h-px w-full overflow-hidden bg-white/10">
          <div className="h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-150" style={{ width: `${shown * 100}%` }} />
        </div>
        <div className="mt-3 flex w-full justify-between text-[10px] uppercase tracking-[0.25em] text-white/45">
          <span>{current ? current.label : "Dimensions stable"}</span>
          <span>{Math.round(shown * 100)}%</span>
        </div>
      </div>
    </motion.div>
  );
}
