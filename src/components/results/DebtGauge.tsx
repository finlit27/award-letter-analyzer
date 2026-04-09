import { cn } from "@/lib/utils";
import type { DebtWarning } from "@/lib/schema";

const META: Record<DebtWarning, { label: string; bg: string; text: string; ring: string; description: string }> = {
  Low: {
    label: "Low Debt",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    ring: "ring-emerald-300",
    description: "Under $5k loans/year, no Parent PLUS",
  },
  Medium: {
    label: "Medium Debt",
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-300",
    description: "$5k–$10k in loans/year",
  },
  High: {
    label: "High Debt",
    bg: "bg-orange-50",
    text: "text-orange-800",
    ring: "ring-orange-400",
    description: "Over $10k loans/year or net price > $30k",
  },
  Critical: {
    label: "Critical Debt",
    bg: "bg-red-50",
    text: "text-red-800",
    ring: "ring-red-400",
    description: "Parent PLUS required or net price > $50k",
  },
};

export function DebtGauge({ level, compact = false }: { level: DebtWarning; compact?: boolean }) {
  const m = META[level];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full ring-1",
        m.bg,
        m.ring,
        compact ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
      aria-label={`Debt warning: ${m.label}. ${m.description}`}
    >
      <span className={cn("w-2 h-2 rounded-full", {
        "bg-emerald-500": level === "Low",
        "bg-amber-500": level === "Medium",
        "bg-orange-500": level === "High",
        "bg-red-500": level === "Critical",
      })} />
      <span className={cn("font-semibold", m.text)}>{m.label}</span>
    </div>
  );
}
