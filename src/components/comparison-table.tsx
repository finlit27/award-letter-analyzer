"use client";

import { AnalysisResult } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Check, AlertTriangle, TrendingDown, Gift } from "lucide-react";
import { motion } from "framer-motion";

interface ComparisonTableProps {
    results: AnalysisResult[];
}

export function ComparisonTable({ results }: ComparisonTableProps) {
    // Sort results by lowest Out of Pocket payment to highlight the best deal
    const sortedResults = [...results].sort((a, b) => a.out_of_pocket_payment - b.out_of_pocket_payment);
    const bestDeal = sortedResults[0];

    return (
        <div className="w-full overflow-x-auto pb-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="min-w-[800px] bg-white rounded-xl shadow-lg overflow-hidden border border-[#E8E4DC]"
            >
                <div className="grid" style={{ gridTemplateColumns: `200px repeat(${results.length}, minmax(220px, 1fr))` }}>

                    {/* Header Row */}
                    <div className="p-4 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] font-semibold text-[#1B4332] flex items-center font-serif">
                        Details
                    </div>
                    {results.map((result, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "p-4 pt-6 border-b border-[#E8E4DC] font-bold text-center relative",
                                result === bestDeal ? "bg-[#1B4332]/5" : "bg-white"
                            )}
                        >
                            {result === bestDeal && (
                                <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-[#1B4332] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">
                                    Best Deal
                                </div>
                            )}
                            <div className="text-lg text-[#1B4332] font-serif">{result.college_name}</div>
                            <div className={cn(
                                "text-xs mt-1 uppercase font-bold",
                                result.analysis.debt_warning === "Critical" ? "text-red-600" :
                                    result.analysis.debt_warning === "High" ? "text-orange-500" :
                                        result.analysis.debt_warning === "Medium" ? "text-[#B68D40]" :
                                            "text-[#1B4332]"
                            )}>
                                {result.analysis.debt_warning} Risk
                            </div>
                        </div>
                    ))}

                    {/* Cost of Attendance */}
                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] font-medium">
                        Total Cost
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-3 border-b border-[#E8E4DC] text-center text-[#4A5568]">
                            {formatCurrency(result.total_cost_of_attendance)}
                        </div>
                    ))}

                    {/* Direct Costs Section */}
                    <div className="col-span-full bg-[#F1F0EB] p-2 text-xs font-bold text-[#4A5568] uppercase tracking-wider pl-4">
                        Direct Costs
                    </div>

                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] pl-6">
                        Tuition
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-3 border-b border-[#E8E4DC] text-center text-[#4A5568] text-sm">
                            {formatCurrency(result.direct_costs.tuition)}
                        </div>
                    ))}

                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] pl-6">
                        Housing & Food
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-3 border-b border-[#E8E4DC] text-center text-[#4A5568] text-sm">
                            {formatCurrency(result.direct_costs.housing)}
                        </div>
                    ))}

                    {/* Free Money Section - FinLit Green */}
                    <div className="col-span-full bg-[#1B4332]/10 p-2 text-xs font-bold text-[#1B4332] uppercase tracking-wider pl-4 flex items-center gap-2">
                        <Gift className="w-3 h-3" /> Free Money (Grants & Scholarships)
                    </div>

                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] pl-6">
                        Merit Aid
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-3 border-b border-[#E8E4DC] text-center text-[#1B4332] font-medium">
                            {result.grants_scholarships.institutional_merit > 0 ? formatCurrency(result.grants_scholarships.institutional_merit) : "-"}
                        </div>
                    ))}

                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] pl-6 font-bold">
                        Total Gift Aid
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-3 border-b border-[#E8E4DC] text-center text-[#1B4332] font-bold bg-[#1B4332]/5">
                            {formatCurrency(result.grants_scholarships.total_gift_aid)}
                        </div>
                    ))}

                    {/* Loans Section - Warning Red */}
                    <div className="col-span-full bg-red-50 p-2 text-xs font-bold text-red-700 uppercase tracking-wider pl-4 flex items-center gap-2">
                        <TrendingDown className="w-3 h-3" /> Debt (Loans) — Must Be Repaid
                    </div>

                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] pl-6">
                        Federal Loans
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-3 border-b border-[#E8E4DC] text-center text-red-600">
                            {formatCurrency(result.loans.federal_subsidized + result.loans.federal_unsubsidized)}
                        </div>
                    ))}

                    <div className="p-3 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm text-[#4A5568] pl-6 flex items-center gap-1">
                        Parent PLUS <AlertTriangle className="w-3 h-3 text-orange-500" />
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className={cn("p-3 border-b border-[#E8E4DC] text-center font-medium", result.loans.parent_plus > 0 ? "text-red-600 bg-red-50/50" : "text-slate-400")}>
                            {result.loans.parent_plus > 0 ? formatCurrency(result.loans.parent_plus) : "-"}
                        </div>
                    ))}

                    {/* Bottom Line */}
                    <div className="col-span-full bg-[#1B4332] p-2 text-xs font-bold text-white uppercase tracking-wider pl-4 text-center">
                        The Bottom Line
                    </div>

                    <div className="p-4 bg-[#FDFBF7] border-b border-r border-[#E8E4DC] text-sm font-bold text-[#1B4332]">
                        Net Price
                        <span className="block text-[10px] font-normal text-[#6B7280]">Cost - Gift Aid</span>
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="p-4 border-b border-[#E8E4DC] text-center font-semibold text-[#1B4332]">
                            {formatCurrency(result.net_price)}
                        </div>
                    ))}

                    <div className="p-4 bg-[#B68D40]/10 border-r border-[#E8E4DC] text-base font-bold text-[#1B4332] flex flex-col justify-center">
                        Out-of-Pocket
                        <span className="block text-[10px] font-normal text-[#6B7280]">What you pay this year (before loans)</span>
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className={cn(
                            "p-4 text-center font-bold text-lg flex items-center justify-center",
                            result === bestDeal ? "bg-[#1B4332] text-white" : "bg-[#FDFBF7] text-[#1B4332]"
                        )}>
                            {formatCurrency(result.out_of_pocket_payment)}
                            {result === bestDeal && <Check className="w-5 h-5 ml-2" />}
                        </div>
                    ))}

                </div>
            </motion.div>
        </div>
    );
}
