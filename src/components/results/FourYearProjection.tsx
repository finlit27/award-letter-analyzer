"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import type { AwardLetter } from "@/lib/schema";
import { projectFourYear } from "@/lib/projection";
import { formatUSD } from "@/lib/money";

interface Props {
  letters: AwardLetter[];
  declineLoans: boolean;
}

const COLORS = ["#1B4332", "#B68D40", "#2D6A4F", "#9A7735", "#52796F", "#7B4F24"];

export function FourYearProjection({ letters, declineLoans }: Props) {
  const [inflationPct, setInflationPct] = useState(5);

  const data = useMemo(() => {
    const inflation = inflationPct / 100;
    const projections = letters.map((l) => projectFourYear(l, inflation, declineLoans));
    return [1, 2, 3, 4].map((year) => {
      const row: Record<string, number | string> = { year: `Year ${year}` };
      letters.forEach((l, i) => {
        row[l.college_name] = projections[i].years[year - 1].outOfPocket;
      });
      return row;
    });
  }, [letters, inflationPct, declineLoans]);

  const totals = useMemo(() => {
    const inflation = inflationPct / 100;
    return letters.map((l) => ({
      name: l.college_name,
      total: projectFourYear(l, inflation, declineLoans).totalOutOfPocket,
    }));
  }, [letters, inflationPct, declineLoans]);

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DC] p-5">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-[#1B4332] font-serif">4-Year Cost Projection</h3>
          <p className="text-sm text-[#6B7280]">Out-of-pocket cost per year, compounded by tuition inflation</p>
        </div>
        <div className="print:hidden flex items-center gap-3 min-w-[260px]">
          <label htmlFor="inflation-slider" className="text-xs text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
            Inflation
          </label>
          <input
            id="inflation-slider"
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={inflationPct}
            onChange={(e) => setInflationPct(Number(e.target.value))}
            className="flex-1 accent-[#B68D40]"
          />
          <span className="text-sm font-semibold text-[#1B4332] tabular-nums w-12 text-right">
            {inflationPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke="#E8E4DC" strokeDasharray="3 3" />
            <XAxis dataKey="year" fontSize={11} stroke="#6B7280" />
            <YAxis tickFormatter={(v: number) => formatUSD(v)} fontSize={11} stroke="#6B7280" />
            <Tooltip
              formatter={(v) => formatUSD(Number(v))}
              contentStyle={{ background: "white", border: "1px solid #E8E4DC", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {letters.map((l, i) => (
              <Line
                key={l.college_name}
                type="monotone"
                dataKey={l.college_name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        {totals.map((t) => (
          <div key={t.name} className="flex items-center justify-between p-2 rounded bg-[#FDFBF7] border border-[#E8E4DC]">
            <span className="text-[#1B4332] truncate">{t.name}</span>
            <span className="font-bold text-[#1B4332] tabular-nums">{formatUSD(t.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
