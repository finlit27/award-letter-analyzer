"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { AwardLetter } from "@/lib/schema";
import { ComparisonTable } from "./ComparisonTable";
import { DeclineLoansToggle } from "./DeclineLoansToggle";
import { ValueScoreGauge } from "./ValueScoreGauge";
import { DebtGauge } from "./DebtGauge";
import { formatUSD } from "@/lib/money";

// Recharts pieces are heavy — load only on the dashboard.
const CostBreakdownBars = dynamic(() => import("./CostBreakdownBars").then((m) => m.CostBreakdownBars), {
  ssr: false,
  loading: () => <div className="h-72 bg-white rounded-xl border border-[#E8E4DC] animate-pulse" />,
});
const FourYearProjection = dynamic(() => import("./FourYearProjection").then((m) => m.FourYearProjection), {
  ssr: false,
  loading: () => <div className="h-80 bg-white rounded-xl border border-[#E8E4DC] animate-pulse" />,
});

interface Props {
  letters: AwardLetter[];
  errors?: string[];
  shareUrl?: string;
}

export function DashboardShell({ letters, errors = [], shareUrl }: Props) {
  const [declineLoans, setDeclineLoans] = useState(false);

  if (letters.length === 0) {
    return (
      <div className="text-center text-[#6B7280] p-12">No analyzed letters to show.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#1B4332] font-serif">Your Comparison</h2>
          <p className="text-sm text-[#6B7280]">
            {letters.length} {letters.length === 1 ? "letter" : "letters"} analyzed
            {errors.length > 0 && (
              <span className="text-amber-700"> · {errors.length} failed</span>
            )}
          </p>
        </div>
        <DeclineLoansToggle value={declineLoans} onChange={setDeclineLoans} />
      </div>

      {shareUrl && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FDFBF7] border border-[#E8E4DC] text-sm">
          <span className="text-[#6B7280]">Share this comparison:</span>
          <code className="flex-1 truncate text-[#1B4332]">{shareUrl}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="text-xs font-semibold text-[#B68D40] hover:text-[#9A7735] underline underline-offset-4"
          >
            Copy
          </button>
        </div>
      )}

      <ComparisonTable letters={letters} declineLoans={declineLoans} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {letters.map((l) => (
          <div
            key={l.college_name}
            className="bg-white rounded-xl border border-[#E8E4DC] p-5 flex flex-col gap-3"
          >
            <h3 className="font-bold text-[#1B4332] font-serif text-lg truncate">
              {l.college_name}
            </h3>
            <div className="flex items-center justify-between">
              <ValueScoreGauge score={l.analysis.value_score} />
              <div className="text-right">
                <div className="text-xs text-[#6B7280] uppercase tracking-wider">Net Price</div>
                <div className="text-2xl font-bold text-[#1B4332] tabular-nums">
                  {formatUSD(l.net_price)}
                </div>
              </div>
            </div>
            <DebtGauge level={l.analysis.debt_warning} />
          </div>
        ))}
      </div>

      <CostBreakdownBars letters={letters} />
      <FourYearProjection letters={letters} declineLoans={declineLoans} />

      {errors.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <p className="font-semibold mb-1">Some letters could not be analyzed:</p>
          <ul className="list-disc list-inside">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
