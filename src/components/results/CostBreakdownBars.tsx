"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { AwardLetter } from "@/lib/schema";
import { formatUSD } from "@/lib/money";

interface Props {
  letters: AwardLetter[];
}

/**
 * Stacked horizontal bars per college: gift aid (negative offset) + cost categories.
 * Read as: total bar = total cost; the gift-aid segment shows what's free,
 * the rest shows what the family is responsible for.
 */
export function CostBreakdownBars({ letters }: Props) {
  const data = letters.map((l) => ({
    name: l.college_name.length > 22 ? l.college_name.slice(0, 20) + "…" : l.college_name,
    Tuition: l.direct_costs.tuition,
    Housing: l.direct_costs.housing,
    Fees: l.direct_costs.fees,
    "Gift Aid Offset": -l.grants_scholarships.total_gift_aid,
  }));

  return (
    <div className="print:hidden w-full h-72 bg-white rounded-xl border border-[#E8E4DC] p-4">
      <h3 className="text-sm font-semibold text-[#1B4332] mb-2 font-serif">Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" tickFormatter={(v: number) => formatUSD(Math.abs(Number(v)))} fontSize={11} stroke="#6B7280" />
          <YAxis type="category" dataKey="name" width={120} fontSize={11} stroke="#1B4332" />
          <Tooltip
            formatter={(v) => formatUSD(Math.abs(Number(v)))}
            cursor={{ fill: "#FDFBF7" }}
            contentStyle={{ background: "white", border: "1px solid #E8E4DC", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Tuition" stackId="a" fill="#1B4332" />
          <Bar dataKey="Housing" stackId="a" fill="#2D6A4F" />
          <Bar dataKey="Fees" stackId="a" fill="#52796F" />
          <Bar dataKey="Gift Aid Offset" stackId="a" fill="#B68D40" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
