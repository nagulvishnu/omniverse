import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useStore } from "@/store";
import { enterHub, skipIntro } from "@/systems/intro";
import { toggleSound } from "@/systems/sound";

export function IntroOverlay() {
  const phase = useStore((s) => s.phase);
  const caption = useStore((s) => s.introCaption);
  const audioOn = useStore((s) => s.audioOn);

  if (phase !== "intro" && phase !== "title") return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* captions */}
      <div className="absolute inset-x-0 bottom-[22%] flex justify-center px-6">
        <AnimatePresence mode="wait">
          {phase === "intro" && caption && (
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.9 }}
              className="max-w-xl text-center text-sm font-light tracking-[0.28em] text-white/80 sm:text-base"
            >
              {caption.toUpperCase()}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="pointer-events-auto absolute bottom-6 left-6 right-6 flex items-center justify-between">
        <button
          onClick={toggleSound}
          className="glass flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white/70 transition hover:text-white"
          aria-pressed={audioOn}
        >
          {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {audioOn ? "Sound on" : "Enable sound"}
        </button>
        {phase === "intro" && (
          <button
            onClick={skipIntro}
            className="glass rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
          >
            Skip intro
          </button>
        )}
      </div>

      {/* title card */}
      <AnimatePresence>
        {phase === "title" && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55),transparent_65%)]" />
            <motion.h1
              initial={{ letterSpacing: "1.2em", opacity: 0, filter: "blur(14px)" }}
              animate={{ letterSpacing: "0.38em", opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-gradient-to-b from-white via-white to-indigo-200 bg-clip-text pl-[0.38em] text-[clamp(2.2rem,9vw,6.5rem)] font-semibold leading-none text-transparent drop-shadow-[0_0_40px_rgba(122,140,255,0.55)]"
            >
              OMNIVERSE
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 1.2 }}
              className="relative mt-6 text-[clamp(0.65rem,1.6vw,0.95rem)] font-light italic tracking-[0.5em] text-indigo-100/80"
            >
              ONE GATEWAY. INFINITE EXPERIENCES.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9, duration: 1 }}
              onClick={enterHub}
              autoFocus
              className="pointer-events-auto group relative mt-14 overflow-hidden rounded-full border border-white/30 bg-white/5 px-10 py-4 text-[12px] font-medium uppercase tracking-[0.4em] text-white backdrop-blur-md transition hover:border-white/70 hover:bg-white/15 hover:shadow-[0_0_50px_rgba(122,140,255,0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Enter the Omniverse</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
