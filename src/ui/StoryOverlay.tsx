import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, Lock, X } from "lucide-react";
import { WORLDS, canEnter } from "@/config/worlds";
import { useStore } from "@/store";
import { rt } from "@/runtime";
import { enterWorld, returnToHub, selectWorld } from "@/systems/navigation";
import { worldGradient } from "./bits";

gsap.registerPlugin(ScrollTrigger);

interface Section {
  kicker: string;
  title: string;
  body: string;
  world?: number;
}
const SECTIONS: Section[] = [
  { kicker: "01 · The Beginning", title: "OMNIVERSE", body: "A single point of light, and then everything. This is the gateway that connects every world we have built." },
  { kicker: "02 · One Central Gateway", title: "The Hub", body: "A place between realities — a platform of light with six doors, each one opening onto a world of its own." },
  { kicker: "03 · Six Different Realities", title: "Six Worlds", body: "Space. Ocean. City. Myth. Machine. Megastructure. Six independent experiences, each with its own site, its own rules, its own identity." },
  ...WORLDS.map((w) => ({ kicker: `${String(w.index + 4).padStart(2, "0")} · ${w.storyTitle}`, title: w.name, body: `${w.tagline} ${w.storyText}`, world: w.index })),
  { kicker: `${String(WORLDS.length + 4).padStart(2, "0")} · Choose Your Reality`, title: "Your Move", body: "Return to the hub, walk up to a portal and step through." },
];

export function StoryOverlay() {
  const open = useStore((s) => s.storyOpen);
  return <AnimatePresence>{open && <Story />}</AnimatePresence>;
}

function Story() {
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scroller.current;
    const wrap = inner.current;
    if (!el || !wrap) return;
    rt.storyP = 0;
    const triggers: ScrollTrigger[] = [];
    triggers.push(
      ScrollTrigger.create({
        scroller: el,
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          rt.storyP = self.progress;
        },
      }),
    );
    wrap.querySelectorAll<HTMLElement>("[data-section]").forEach((sec, i) => {
      triggers.push(
        ScrollTrigger.create({
          scroller: el,
          trigger: sec,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (!self.isActive) return;
            setActive(i);
            const w = SECTIONS[i].world;
            useStore.setState({ focused: w !== undefined ? WORLDS[w].id : null });
          },
        }),
      );
    });
    ScrollTrigger.refresh();
    return () => {
      triggers.forEach((t) => t.kill());
      rt.storyP = 0;
    };
  }, []);

  const close = () => {
    useStore.setState({ storyOpen: false, focused: null, cameraMode: "overview" });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="fixed inset-0 z-30" role="region" aria-label="Story">
      <div ref={scroller} className="story-scroll absolute inset-0 overflow-y-auto overscroll-contain">
        <div ref={inner}>
          {SECTIONS.map((s, i) => {
            const w = s.world !== undefined ? WORLDS[s.world] : null;
            const right = i % 2 === 1;
            return (
              <section key={i} data-section className="flex min-h-screen items-end px-6 pb-[14vh] sm:items-center sm:px-16 sm:pb-0">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ root: scroller, amount: 0.4 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className={`max-w-xl rounded-3xl bg-gradient-to-br from-black/45 to-black/10 p-6 backdrop-blur-[3px] sm:p-8 ${right ? "sm:ml-auto" : ""}`}
                >
                  <div className="text-[11px] uppercase tracking-[0.35em] text-white/55">{s.kicker}</div>
                  <h2
                    className="mt-3 text-[clamp(2.4rem,7vw,5rem)] font-semibold leading-none tracking-[0.18em]"
                    style={w ? { background: worldGradient(w), WebkitBackgroundClip: "text", color: "transparent" } : { color: "white" }}
                  >
                    {s.title}
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-lg">{s.body}</p>
                  {w && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          useStore.setState({ storyOpen: false });
                          selectWorld(w.id);
                        }}
                        className="glass flex h-11 items-center gap-2 rounded-full px-5 text-[11px] uppercase tracking-[0.2em] text-white/90 hover:text-white"
                      >
                        <Eye size={14} /> Preview in hub
                      </button>
                      <button
                        disabled={!canEnter(w)}
                        onClick={() => enterWorld(w.id)}
                        className="flex h-11 items-center gap-2 rounded-full px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
                        style={canEnter(w) ? { background: worldGradient(w) } : undefined}
                      >
                        {canEnter(w) ? <ArrowRight size={14} /> : <Lock size={13} />}
                        {canEnter(w) ? "Enter World" : w.status === "unavailable" ? "Unavailable" : "Coming Soon"}
                      </button>
                    </div>
                  )}
                  {i === SECTIONS.length - 1 && (
                    <button
                      onClick={() => {
                        close();
                        returnToHub();
                      }}
                      className="mt-6 flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-7 text-[12px] font-semibold uppercase tracking-[0.25em] text-white shadow-[0_8px_40px_-8px_#7a8cff]"
                    >
                      Enter the hub <ArrowRight size={15} />
                    </button>
                  )}
                </motion.div>
              </section>
            );
          })}
        </div>
      </div>

      <button onClick={close} aria-label="Close story" className="glass absolute right-4 top-4 z-10 flex h-11 items-center gap-2 rounded-full px-4 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:text-white sm:right-6 sm:top-6">
        <X size={15} /> <span className="hidden sm:inline">Close story</span>
      </button>
      <div className="pointer-events-none absolute left-4 top-5 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/80 sm:left-6 sm:top-7">OMNIVERSE</div>
      <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        {SECTIONS.map((_, i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full transition-all ${i === active ? "scale-150 bg-white" : "bg-white/30"}`} />
        ))}
      </div>
    </motion.div>
  );
}
