import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOpeningStockSummary } from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import { Package, TrendingUp, DollarSign, Layers, Loader2 } from "lucide-react";

export function OpeningStockSummary() {
  const getSummaryFn = useServerFn(getOpeningStockSummary);

  const { data, isLoading } = useQuery({
    queryKey: ["opening-stock-summary"],
    queryFn: () => getSummaryFn(),
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center h-24 shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin text-[#E11D48]" />
      </div>
    );
  }

  if (!data || data.totalProducts === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#E11D48]" />
          <h3 className="text-xs font-extrabold tracking-wide uppercase text-slate-200">
            Initial Opening Stock Audit Summary
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Verified Accounting Snapshot
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3 h-3 text-slate-400" /> Opening Products
          </div>
          <div className="text-lg font-black text-white mt-1 tabular-nums">
            {data.totalProducts} <span className="text-xs text-slate-400 font-medium">items</span>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" /> Total Opening Units
          </div>
          <div className="text-lg font-black text-white mt-1 tabular-nums">
            {data.totalUnits.toLocaleString()}{" "}
            <span className="text-xs text-slate-400 font-medium">units</span>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-400" /> Opening Cost Value
          </div>
          <div className="text-lg font-black text-amber-400 mt-1 tabular-nums">
            {formatGBP(data.openingCostValuePence / 100)}
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Opening Retail Value
          </div>
          <div className="text-lg font-black text-emerald-400 mt-1 tabular-nums">
            {formatGBP(data.openingRetailValuePence / 100)}
          </div>
        </div>
      </div>
    </div>
  );
}
