import { Trophy } from "lucide-react";

export function WinnerBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1B4332] text-[#B68D40] text-xs font-bold uppercase tracking-wider"
      aria-label="Best value"
    >
      <Trophy className="w-3 h-3" aria-hidden />
      Best Value
    </span>
  );
}
