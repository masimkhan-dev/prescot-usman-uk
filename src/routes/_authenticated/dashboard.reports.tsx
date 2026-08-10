import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReports } from "@/lib/reports.functions";
import { formatGBP } from "@/lib/utils";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { CardSkeleton } from "@/components/dashboard/TableSkeleton";
import {
  AlertCircle,
  Calendar,
  BarChart3,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: ReportsPage,
});

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ReportsPage() {
  const getReportsFn = useServerFn(getReports);

  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const datePresets = useMemo(() => {
    const now = new Date();
    const todayStr = formatDateString(now);

    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = formatDateString(yest);

    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const thisWeekStartStr = formatDateString(monday);

    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStartStr = formatDateString(firstOfMonth);

    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStartStr = formatDateString(firstOfLastMonth);
    const lastMonthEndStr = formatDateString(lastOfLastMonth);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = formatDateString(thirtyDaysAgo);

    return [
      { label: "Today", from: todayStr, to: todayStr },
      { label: "Yesterday", from: yesterdayStr, to: yesterdayStr },
      { label: "This Week", from: thisWeekStartStr, to: todayStr },
      { label: "This Month", from: thisMonthStartStr, to: todayStr },
      { label: "Last Month", from: lastMonthStartStr, to: lastMonthEndStr },
      { label: "Last 30 Days", from: thirtyDaysAgoStr, to: todayStr },
      { label: "All Time", from: undefined, to: undefined },
    ];
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: () => getReportsFn({ data: dateRange }),
    staleTime: 1000 * 60 * 2, // 2 mins cache
  });

  if (isLoading || !data) {
    return (
      <div className="db-page space-y-6">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Business Operations Report</h1>
          </div>
        </div>
        <CardSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="db-page space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Business Operations Report</h1>
            <PageHelpButton
              pageTitle="Reports"
              pageKey="reports"
              steps={[
                "Use reports to review sales, repairs, expenses and profit.",
                "Choose the required date range before reviewing totals.",
                "Review payment breakdown and supplier balances.",
              ]}
              firstTimeTip="Tip: Select a date range to filter operational P&L totals."
            />
          </div>
          <p className="db-page-subtitle">
            Operational P&L summary, COGS analysis, supplier balances, and stock valuation (
            {data.fromDate} to {data.toDate}).
          </p>
        </div>

        {/* Enhanced Date Range Filter Panel */}
        <div className="db-card p-3 sm:p-4 rounded-xl border border-border/80 shadow-xs space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="w-4 h-4 text-brand" />
              <span>Date Filter</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
              {dateRange.from || dateRange.to ? (
                <span>
                  {dateRange.from || "Start"} ➔ {dateRange.to || "Today"}
                </span>
              ) : (
                <span>All Time</span>
              )}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {datePresets.map((p) => {
              const isActive =
                (p.from === dateRange.from || (!p.from && !dateRange.from)) &&
                (p.to === dateRange.to || (!p.to && !dateRange.to));
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDateRange({ from: p.from, to: p.to })}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Input Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
            <span className="text-[11px] font-bold text-muted-foreground">Custom:</span>
            <input
              type="date"
              value={dateRange.from || ""}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="border border-border rounded-lg px-2 py-1 text-xs outline-none font-medium bg-background text-foreground focus:border-brand focus:ring-1 focus:ring-brand min-h-[32px]"
            />
            <span className="text-muted-foreground text-xs font-medium">to</span>
            <input
              type="date"
              value={dateRange.to || ""}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="border border-border rounded-lg px-2 py-1 text-xs outline-none font-medium bg-background text-foreground focus:border-brand focus:ring-1 focus:ring-brand min-h-[32px]"
            />
            {(dateRange.from || dateRange.to) && (
              <button
                type="button"
                onClick={() => setDateRange({})}
                className="text-brand font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer ml-auto"
                title="Reset date filter"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-center gap-2.5 p-3.5 bg-muted border border-border rounded-xl text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span>
          <strong className="text-foreground">Operational Summary:</strong> Figures below are
          calculated from POS register sales, completed repairs, and expense logs. This is an
          operational performance report, not a statutory general ledger.
        </span>
      </div>

      {/* P&L Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Gross Sales",
            value: formatGBP(data.grossRevenuePence / 100),
            sub: `Returns: ${formatGBP(data.refundsPence / 100)}`,
            color: "text-ink",
          },
          {
            label: "Cost of Goods Sold",
            value: formatGBP(data.cogsPence / 100),
            sub: `Gross Margin: ${formatGBP(data.grossProfitPence / 100)}`,
            color: "text-amber-700",
          },
          {
            label: "Repair Revenue",
            value: formatGBP(data.repairRevenuePence / 100),
            sub: "Collected in period",
            color: "text-emerald-700",
          },
          {
            label: "Net Op Profit",
            value: formatGBP(data.netProfitPence / 100),
            sub: `Less expenses (${formatGBP(data.expensesTotalPence / 100)})`,
            color: data.netProfitPence >= 0 ? "text-emerald-700" : "text-destructive",
          },
        ].map((card) => (
          <div key={card.label} className="db-card border-l-4 border-l-brand flex flex-col justify-between">
            <div className="db-section-label">{card.label}</div>
            <div className={`text-xl font-extrabold mt-2 ${card.color} tabular-nums tracking-tight truncate`}>
              {card.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 truncate">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Payment + Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Breakdown */}
        <div className="db-card space-y-1">
          <h2 className="db-card-title">Payment Method Collection Breakdown</h2>
          <div className="space-y-0 divide-y divide-border text-xs">
            {[
              { label: "Cash Collected", value: formatGBP(data.cashPence / 100) },
              { label: "Card Payments", value: formatGBP(data.cardPence / 100) },
              { label: "Bank Transfers", value: formatGBP(data.bankPence / 100) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2.5">
                <span className="text-muted-foreground font-medium">{row.label}</span>
                <span className="font-extrabold text-ink tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="db-card space-y-1">
          <h2 className="db-card-title">Stock Valuation Overview</h2>
          <div className="space-y-0 divide-y divide-border text-xs">
            <div className="flex justify-between items-center py-2.5">
              <span className="text-muted-foreground font-medium">Stock Value (at Cost)</span>
              <span className="font-extrabold text-ink tabular-nums">
                {formatGBP(data.stockValueCostPence / 100)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-muted-foreground font-medium">Stock Value (at Retail)</span>
              <span className="font-extrabold text-ink tabular-nums">
                {formatGBP(data.stockValueRetailPence / 100)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 font-bold text-emerald-700">
              <span>Potential Inventory Gross Profit</span>
              <span className="tabular-nums">
                {formatGBP((data.stockValueRetailPence - data.stockValueCostPence) / 100)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Balances */}
      {data.supplierBalances.length > 0 && (
        <div className="db-card !p-0 overflow-hidden">
          <h2 className="db-card-title px-5 pt-5">Supplier Balances</h2>
          <div className="overflow-x-auto">
            <table className="db-table">
              <thead>
                <tr>
                  <th className="db-th">Supplier</th>
                  <th className="db-th text-right">PO Total</th>
                  <th className="db-th text-right">Total Paid</th>
                  <th className="db-th text-right">Balance Owed</th>
                </tr>
              </thead>
              <tbody>
                {data.supplierBalances.map((sup) => (
                  <tr key={sup.supplier_id} className="db-tr-hover">
                    <td className="db-td font-bold text-ink">{sup.name}</td>
                    <td className="db-td text-right font-mono tabular-nums text-muted-foreground">
                      {formatGBP((sup.total_ordered_pence ?? 0) / 100)}
                    </td>
                    <td className="db-td text-right font-mono tabular-nums text-muted-foreground">
                      {formatGBP((sup.total_paid_pence ?? 0) / 100)}
                    </td>
                    <td
                      className={`db-td text-right font-extrabold font-mono tabular-nums ${sup.balance_pence > 0 ? "text-destructive" : "text-emerald-700"}`}
                    >
                      {formatGBP((sup.balance_pence ?? 0) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
