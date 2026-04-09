import { cn } from "@/lib/utils";

interface Props {
  score: number; // 0-100
  size?: number;
}

/**
 * Compact radial gauge for value_score (0-100). Pure SVG, no recharts dep.
 */
export function ValueScoreGauge({ score, size = 80 }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // Color: green ≥75, amber 50–74, orange 25–49, red <25
  const stroke =
    clamped >= 75 ? "#16a34a" : clamped >= 50 ? "#B68D40" : clamped >= 25 ? "#ea580c" : "#dc2626";

  const label =
    clamped >= 75 ? "Excellent value" : clamped >= 50 ? "Good value" : clamped >= 25 ? "Fair value" : "Poor value";

  return (
    <div className="relative inline-flex flex-col items-center" aria-label={`Value score ${clamped} out of 100. ${label}.`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8E4DC"
          strokeWidth={6}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div
        className={cn("absolute inset-0 pointer-events-none flex flex-col items-center justify-center")}
      >
        <span className="text-2xl font-bold text-[#1B4332] font-serif">{clamped}</span>
        <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Value</span>
      </div>
    </div>
  );
}
