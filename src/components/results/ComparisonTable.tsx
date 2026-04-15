"use client";

import { useMemo, useState } from "react";
import type { AwardLetter } from "@/lib/schema";
import { calcOutOfPocket, sumLoans, formatUSD } from "@/lib/money";
import { projectFourYear } from "@/lib/projection";
import { findWinner } from "@/lib/comparison";
import { DebtGauge } from "./DebtGauge";
import { WinnerBadge } from "./WinnerBadge";
import { cn } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";

interface Props {
  letters: AwardLetter[];
  declineLoans: boolean;
  inflationRate?: number;
}

type SortKey = "college" | "giftAid" | "netPrice" | "loans" | "fourYear" | "debt" | "value";

interface Row {
  letter: AwardLetter;
  giftAid: number;
  netPrice: number;
  loans: number;
  fourYear: number;
  oneYearOop: number;
}

export function ComparisonTable({ letters, declineLoans, inflationRate = 0.05 }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("fourYear");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const winner = useMemo(() => findWinner(letters, declineLoans), [letters, declineLoans]);

  const rows: Row[] = useMemo(() => {
    return letters.map((l) => {
      const oneYearOop = calcOutOfPocket(l, declineLoans);
      return {
        letter: l,
        giftAid: l.grants_scholarships.total_gift_aid,
        netPrice: l.net_price,
        loans: sumLoans(l),
        fourYear: projectFourYear(l, inflationRate, declineLoans).totalOutOfPocket,
        oneYearOop,
      };
    });
  }, [letters, declineLoans, inflationRate]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case "college":
          av = a.letter.college_name;
          bv = b.letter.college_name;
          break;
        case "giftAid":
          av = a.giftAid;
          bv = b.giftAid;
          break;
        case "netPrice":
          av = a.netPrice;
          bv = b.netPrice;
          break;
        case "loans":
          av = a.loans;
          bv = b.loans;
          break;
        case "fourYear":
          av = a.fourYear;
          bv = b.fourYear;
          break;
        case "debt": {
          const order = { Low: 0, Medium: 1, High: 2, Critical: 3 } as const;
          av = order[a.letter.analysis.debt_warning];
          bv = order[b.letter.analysis.debt_warning];
          break;
        }
        case "value":
          av = a.letter.analysis.value_score;
          bv = b.letter.analysis.value_score;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "value" || key === "giftAid" ? "desc" : "asc");
    }
  };

  const Th = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th
      scope="col"
      className={cn(
        "px-3 py-3 text-xs uppercase tracking-wider text-[#6B7280] font-semibold cursor-pointer select-none",
        align === "right" ? "text-right" : "text-left",
      )}
      onClick={() => toggleSort(k)}
      aria-sort={sortKey === k ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-40" aria-hidden />
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto print:overflow-visible bg-white rounded-xl border border-[#E8E4DC] shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-[#FDFBF7] sticky top-0 border-b border-[#E8E4DC]">
          <tr>
            <Th k="college" label="College" />
            <Th k="giftAid" label="Gift Aid" align="right" />
            <Th k="netPrice" label="Net Price/yr" align="right" />
            <Th k="loans" label="Loans/yr" align="right" />
            <Th k="fourYear" label="4-Year Cost" align="right" />
            <Th k="debt" label="Debt" />
            <Th k="value" label="Value" align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isWinner = winner && row.letter.college_name === winner.college_name;
            return (
              <tr
                key={row.letter.college_name}
                className={cn(
                  "border-b border-[#E8E4DC] last:border-0 transition-colors hover:bg-[#FDFBF7]",
                  isWinner && "bg-[#1B4332]/5",
                )}
              >
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1B4332] font-serif">
                      {row.letter.college_name}
                    </span>
                    {isWinner && <WinnerBadge />}
                  </div>
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-emerald-700 font-semibold">
                  {formatUSD(row.giftAid)}
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-[#1B4332]">
                  {formatUSD(row.netPrice)}
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-[#6B7280]">
                  {row.loans > 0 ? formatUSD(row.loans) : "—"}
                </td>
                <td className="px-3 py-4 text-right tabular-nums font-bold text-[#1B4332]">
                  {formatUSD(row.fourYear)}
                </td>
                <td className="px-3 py-4">
                  <DebtGauge level={row.letter.analysis.debt_warning} compact />
                </td>
                <td className="px-3 py-4 text-right tabular-nums font-semibold text-[#B68D40]">
                  {row.letter.analysis.value_score}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
