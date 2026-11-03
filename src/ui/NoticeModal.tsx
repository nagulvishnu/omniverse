import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { useStore } from "@/store";

export function NoticeModal() {
  const notice = useStore((s) => s.notice);
  const close = () => useStore.setState({ notice: null });
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
          onClick={close}
          role="alertdialog"
          aria-label={notice.title}
        >
          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-3xl p-7"
          >
            <div className="mb-3 flex items-center gap-3">
              {notice.tone === "error" ? <AlertTriangle className="text-amber-300" size={22} /> : <Info className="text-indigo-300" size={22} />}
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">{notice.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{notice.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              {notice.actions?.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    close();
                    a.run();
                  }}
                  className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                >
                  {a.label}
                </button>
              ))}
              <button onClick={close} autoFocus className="glass rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:text-white">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
