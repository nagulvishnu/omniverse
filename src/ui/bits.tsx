import type { ReactNode } from "react";
import { STATUS_LABEL, type Availability, type WorldConfig } from "@/config/worlds";
import { cn } from "@/utils/cn";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="3" fill="#fff" />
      <circle cx="16" cy="16" r="9" stroke="url(#lg)" strokeWidth="1.4" />
      <ellipse cx="16" cy="16" rx="14" ry="6" stroke="url(#lg)" strokeWidth="1.2" transform="rotate(-30 16 16)" />
      <ellipse cx="16" cy="16" rx="14" ry="6" stroke="url(#lg)" strokeWidth="1.2" transform="rotate(30 16 16)" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#7a8cff" />
          <stop offset="1" stopColor="#c07dff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn("group flex items-center gap-3 text-left", className)} aria-label="OMNIVERSE — return to hub">
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.42em] text-white">OMNIVERSE</span>
        <span className="mt-1 hidden text-[9px] tracking-[0.3em] text-white/45 sm:block">ONE GATEWAY</span>
      </span>
    </button>
  );
}

const STATUS_STYLE: Record<Availability, string> = {
  available: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  "coming-soon": "border-amber-300/40 bg-amber-300/10 text-amber-100",
  unavailable: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};
const DOT: Record<Availability, string> = {
  available: "bg-emerald-400",
  "coming-soon": "bg-amber-300",
  unavailable: "bg-rose-400",
};

export function StatusBadge({ status }: { status: Availability }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em]", STATUS_STYLE[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status], status === "available" && "animate-pulse")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function IconButton({
  label,
  onClick,
  active,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "glass grid h-10 w-10 place-items-center rounded-full text-white/80 transition hover:scale-105 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
        active && "border-white/40 bg-white/15 text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function worldGradient(w: WorldConfig) {
  return `linear-gradient(135deg, ${w.colors.primary}, ${w.colors.secondary})`;
}
