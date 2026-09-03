import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardStatCards } from "@/components/dashboard/StatCards";
import { getDashboardSummary } from "@/lib/dashboard.functions";
import { formatGBP } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp, Zap, CalendarCheck, CheckCircle2 } from "lucide-react";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { CardSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const getSummaryFn = useServerFn(getDashboardSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getSummaryFn(),
    staleTime: 1000 * 30, // 30s cache
  });

  if (isLoading) {
    return (
      <div className="db-page space-y-6">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Dashboard Overview</h1>
          </div>
        </div>
        <CardSkeleton count={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-destructive bg-destructive/8 rounded-xl text-xs font-bold border border-destructive/20">
        Failed to load dashboard summary. Please refresh.
      </div>
    );
  }

  return (
    <div className="db-page space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Dashboard Overview</h1>
          </div>
          <p className="db-page-subtitle">
            Today's real-time snapshot of retail sales, repairs, and inventory.
          </p>
        </div>

        <PageHelpButton
          pageTitle="Overview"
          pageKey="overview"
          steps={[
            "Check sales and repairs for today's activity.",
            "Review outstanding balances and active repair tickets.",
            "Use the sidebar to manage daily store work.",
          ]}
          firstTimeTip="Overview shows today's live business summary. Use Quick Actions to start a new sale or repair."
        />
      </div>

      {/* Today's Daily Closing Banner */}
      {data.todayDailySale ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-800 dark:text-emerald-200">
                Today&apos;s Store Closing Recorded:
              </span>{" "}
              <span className="font-black text-foreground tabular-nums">
                Total {formatGBP(data.todayDailySale.total_amount)}
              </span>{" "}
              <span className="text-muted-foreground">
                (Cash: {formatGBP(data.todayDailySale.cash_amount)} • Card: {formatGBP(data.todayDailySale.card_amount)} • Bank: {formatGBP(data.todayDailySale.bank_amount)})
              </span>
            </div>
          </div>
          <Link
            to="/dashboard/daily-sales"
            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
          >
            <span>View / Edit Closing</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-brand shrink-0" />
            <span className="text-foreground">
              <strong>End-of-Day Closing Pending:</strong> Remember to record today&apos;s Cash, Card, and Bank takings before closing the shop.
            </span>
          </div>
          <Link
            to="/dashboard/daily-sales"
            className="px-3 py-1 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand/90 transition-colors shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Enter Daily Closing</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <DashboardStatCards
        stats={[
          {
            label: "Today's Retail Sales",
            value: formatGBP(data.todaySalesPence / 100),
            change: `${data.todaySaleCount} sales`,
          },
          {
            label: "Repair Payments Today",
            value: formatGBP(data.todayRepairRevenuePence / 100),
            change: "Collected",
          },
          {
            label: "Total Stock Value",
            value: formatGBP((data.totalStockValuePence ?? 0) / 100),
            change: "Current inventory valuation",
          },
          {
            label: "Pending Repairs",
            value: data.pendingRepairs.toString(),
            change: "Active tickets",
          },
          {
            label: "Low Stock Items",
            value: data.lowStock.toString(),
            change: "At/below threshold",
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quick Actions */}
        <div className="lg:col-span-4 db-card space-y-4">
          <div className="flex items-center gap-2 db-card-title">
            <Zap className="w-3.5 h-3.5 text-brand" />
            Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
            <Link
              to="/dashboard/daily-sales"
              className="btn-primary text-center !py-3 !text-xs min-h-[44px]"
            >
              Daily Closing
            </Link>
            <Link
              to="/dashboard/pos"
              className="btn-outline text-center !py-3 !text-xs min-h-[44px]"
            >
              New Sale
            </Link>
            <Link
              to="/dashboard/repairs"
              className="btn-dark text-center !py-3 !text-xs min-h-[44px]"
            >
              New Repair
            </Link>
            <Link
              to="/dashboard/expenses"
              className="btn-outline text-center !py-3 !text-xs min-h-[44px]"
            >
              Add Expense
            </Link>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="lg:col-span-8 db-card space-y-3">
          <div className="flex items-center justify-between db-card-title">
            <span>Today's Sales</span>
            <Link
              to="/dashboard/sales"
              className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 -mt-0.5"
            >
              View Log <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data.recentSales.length === 0 ? (
            <EmptyState
              title="No sales recorded today"
              description="Complete a POS sale to see recent transactions here."
            />
          ) : (
            <div className="overflow-x-auto">
              <ul className="space-y-0 divide-y divide-border min-w-[280px]">
                {data.recentSales.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink truncate">{s.invoice_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {(s.customers as { name: string } | null)?.name || "Walk-in Customer"}
                      </div>
                    </div>
                    <span className="font-extrabold text-ink tabular-nums shrink-0">
                      {formatGBP((s.total_pence ?? 0) / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
