import { createFileRoute, Link } from "@tanstack/react-router";
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
  Smartphone,
  CalendarCheck,
  Banknote,
  CreditCard,
  Building2,
  Calculator,
  Receipt,
  ArrowRight,
  TrendingUp,
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

      {/* AUTHORITATIVE TURNOVER SECTION: Prescot Daily Sales Closing & Net Cashflow */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-brand" />
              <h2 className="text-base font-extrabold text-foreground">
                Daily Sales Closing &amp; Net Cashflow
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-brand/10 text-brand text-[10px] font-extrabold uppercase tracking-wide">
                Authoritative Turnover
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actual store daily takings (Cash + Card + Bank) less store expenses ({data.fromDate} to {data.toDate}).
            </p>
          </div>

          <Link
            to="/dashboard/daily-sales"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <span>Record Daily Sales</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 6 Key Closing Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Cash Sales */}
          <div className="db-card p-3.5 space-y-1 border-t-2 border-t-emerald-600">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Cash Sales</span>
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-foreground tabular-nums tracking-tight truncate">
              {formatGBP((data.dailyClosing?.cashPence ?? 0) / 100)}
            </div>
            <div className="text-[10px] text-muted-foreground">Drawer takings</div>
          </div>

          {/* Card Sales */}
          <div className="db-card p-3.5 space-y-1 border-t-2 border-t-blue-600">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Card Sales</span>
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-lg font-black text-foreground tabular-nums tracking-tight truncate">
              {formatGBP((data.dailyClosing?.cardPence ?? 0) / 100)}
            </div>
            <div className="text-[10px] text-muted-foreground">Terminal total</div>
          </div>

          {/* Bank Transfer */}
          <div className="db-card p-3.5 space-y-1 border-t-2 border-t-purple-600">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Bank Transfer</span>
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-lg font-black text-foreground tabular-nums tracking-tight truncate">
              {formatGBP((data.dailyClosing?.bankPence ?? 0) / 100)}
            </div>
            <div className="text-[10px] text-muted-foreground">Direct transfers</div>
          </div>

          {/* Total Sales */}
          <div className="db-card p-3.5 space-y-1 border-t-2 border-t-brand bg-brand/5">
            <div className="text-[10px] font-extrabold text-brand uppercase flex items-center justify-between">
              <span>Total Sales</span>
              <Calculator className="w-3.5 h-3.5 text-brand" />
            </div>
            <div className="text-lg font-black text-brand tabular-nums tracking-tight truncate">
              {formatGBP((data.dailyClosing?.totalSalesPence ?? 0) / 100)}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">Cash+Card+Bank</div>
          </div>

          {/* Expenses */}
          <div className="db-card p-3.5 space-y-1 border-t-2 border-t-rose-600">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Expenses</span>
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-lg font-black text-destructive tabular-nums tracking-tight truncate">
              {formatGBP((data.expensesTotalPence ?? 0) / 100)}
            </div>
            <div className="text-[10px] text-muted-foreground">Store expenses</div>
          </div>

          {/* Net (Total Sales - Expenses) */}
          <div
            className={`db-card p-3.5 space-y-1 border-t-2 ${
              (data.dailyClosing?.netProfitPence ?? 0) >= 0
                ? "border-t-emerald-600 bg-emerald-500/5"
                : "border-t-destructive bg-destructive/5"
            }`}
          >
            <div className="text-[10px] font-extrabold uppercase flex items-center justify-between">
              <span
                className={
                  (data.dailyClosing?.netProfitPence ?? 0) >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                Net Profit
              </span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div
              className={`text-lg font-black tabular-nums tracking-tight truncate ${
                (data.dailyClosing?.netProfitPence ?? 0) >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatGBP((data.dailyClosing?.netProfitPence ?? 0) / 100)}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">Sales - Expenses</div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        {data.dailyClosing?.entries && data.dailyClosing.entries.length > 0 ? (
          <div className="db-card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/80 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-foreground">
                Daily Closing Breakdown Log ({data.dailyClosing.entries.length} day{data.dailyClosing.entries.length > 1 ? "s" : ""})
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">
                {data.fromDate} ➔ {data.toDate}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="db-table">
                <thead>
                  <tr>
                    <th className="db-th">Date</th>
                    <th className="db-th">Staff</th>
                    <th className="db-th text-right">Cash</th>
                    <th className="db-th text-right">Card</th>
                    <th className="db-th text-right">Bank Transfer</th>
                    <th className="db-th text-right text-brand">Total Sales</th>
                    <th className="db-th">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyClosing.entries.map((entry) => (
                    <tr key={entry.id} className="db-tr-hover">
                      <td className="db-td font-extrabold text-foreground whitespace-nowrap">
                        {entry.entry_date}
                      </td>
                      <td className="db-td font-medium text-muted-foreground whitespace-nowrap">
                        {entry.staff_name}
                      </td>
                      <td className="db-td text-right font-mono tabular-nums text-foreground">
                        {formatGBP(entry.cash_amount)}
                      </td>
                      <td className="db-td text-right font-mono tabular-nums text-foreground">
                        {formatGBP(entry.card_amount)}
                      </td>
                      <td className="db-td text-right font-mono tabular-nums text-foreground">
                        {formatGBP(entry.bank_amount)}
                      </td>
                      <td className="db-td text-right font-mono font-black tabular-nums text-brand">
                        {formatGBP(entry.total_amount)}
                      </td>
                      <td className="db-td text-xs text-muted-foreground max-w-xs truncate">
                        {entry.notes || "—"}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Totals Row */}
                  <tr className="bg-muted/40 font-extrabold border-t-2 border-border">
                    <td className="db-td text-foreground" colSpan={2}>
                      Total for Selected Period ({data.dailyClosing.entries.length} recorded day{data.dailyClosing.entries.length > 1 ? "s" : ""})
                    </td>
                    <td className="db-td text-right font-mono tabular-nums text-foreground">
                      {formatGBP((data.dailyClosing.cashPence ?? 0) / 100)}
                    </td>
                    <td className="db-td text-right font-mono tabular-nums text-foreground">
                      {formatGBP((data.dailyClosing.cardPence ?? 0) / 100)}
                    </td>
                    <td className="db-td text-right font-mono tabular-nums text-foreground">
                      {formatGBP((data.dailyClosing.bankPence ?? 0) / 100)}
                    </td>
                    <td className="db-td text-right font-mono font-black tabular-nums text-brand">
                      {formatGBP((data.dailyClosing.totalSalesPence ?? 0) / 100)}
                    </td>
                    <td className="db-td text-xs text-muted-foreground">
                      Net: {formatGBP((data.dailyClosing.netProfitPence ?? 0) / 100)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-muted-foreground">
            <span>
              No daily closing records found for <strong>{data.fromDate}</strong> to <strong>{data.toDate}</strong>.
            </span>
            <Link
              to="/dashboard/daily-sales"
              className="px-3 py-1.5 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand/90 transition-colors shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Enter Daily Sales Closing</span>
            </Link>
          </div>
        )}
      </div>

      {/* OPERATIONAL RECORDS SECTION: Invoices, Repairs & POS Reference (Kept Separate) */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Operational Invoices &amp; POS Register Reference (Records Only)
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground italic">
            Invoices &amp; repairs are kept separate from authoritative daily sales turnover.
          </span>
        </div>

        {/* Notice */}
        <div className="flex items-center gap-2.5 p-3.5 bg-muted/50 border border-border rounded-xl text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>
            <strong className="text-foreground">Operational Reference:</strong> Figures below reflect individual POS ticket checkouts, completed repair invoices, and inventory logs.
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
            sub: data.isMarginPending
              ? `Gross Margin: ${formatGBP(data.grossProfitPence / 100)} (⚠️ Cost pending on ${data.unknownCostItemsCount} item${data.unknownCostItemsCount > 1 ? "s" : ""})`
              : `Gross Margin: ${formatGBP(data.grossProfitPence / 100)}`,
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
          <div
            key={card.label}
            className="db-card border-l-4 border-l-brand flex flex-col justify-between"
          >
            <div className="db-section-label">{card.label}</div>
            <div
              className={`text-xl font-extrabold mt-2 ${card.color} tabular-nums tracking-tight truncate`}
            >
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

      {/* Phone Buy & Sell KPI Panel — informational breakdown only */}
      {data.phoneSummary && (
        <div className="db-card space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <h2 className="db-card-title">Phone Buy & Sell — Sales & Stock Overview</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Informational breakdown only. Phone revenue and COGS are already included in the overall Sales Revenue and P&amp;L figures above — they are not added again here.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "In Stock", value: String(data.phoneSummary.units_in_stock ?? 0) + " units" },
              {
                label: "Phones Sold",
                value: `${data.phoneSummary.units_sold ?? 0} units${
                  data.phoneSummary.direct_sales_count ? ` (${data.phoneSummary.direct_sales_count} direct)` : ""
                }`,
              },
              { label: "Stock Cost Value", value: formatGBP((data.phoneSummary.stock_cost_value_pence ?? 0) / 100) },
              { label: "Phone Revenue (sold)", value: formatGBP((data.phoneSummary.sold_revenue_pence ?? 0) / 100) },
              { label: "Phone COGS (known)", value: formatGBP((data.phoneSummary.sold_cogs_pence ?? 0) / 100) },
              {
                label: "Phone Gross Margin",
                value: formatGBP((data.phoneSummary.gross_margin_pence ?? 0) / 100),
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-extrabold text-foreground tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          {data.phoneSummary.direct_sales_unknown_cost_count > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 font-medium">
              ⚠️ Note: Includes {data.phoneSummary.direct_sales_unknown_cost_count} direct phone sale(s) with unrecorded cost (Revenue: {formatGBP(data.phoneSummary.direct_sales_unknown_cost_revenue_pence / 100)}). Margin shown is computed on units with known purchase costs only.
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
