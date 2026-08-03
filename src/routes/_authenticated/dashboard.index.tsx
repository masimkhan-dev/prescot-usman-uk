import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardStatCards } from "@/components/dashboard/StatCards";
import { getDashboardSummary } from "@/lib/dashboard.functions";
import { formatGBP } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Loader2, ArrowRight, TrendingUp, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const getSummaryFn = useServerFn(getDashboardSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getSummaryFn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-brand" />
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
    <div className="db-page">
      {/* Page Header */}
      <div className="db-page-header">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand" />
          <h1 className="db-page-title">Dashboard Overview</h1>
        </div>
        <p className="db-page-subtitle">
          Today's real-time snapshot of retail sales, repairs, and inventory.
        </p>
      </div>

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

      <div className="grid md:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <div className="db-card space-y-4">
          <div className="flex items-center gap-2 db-card-title">
            <Zap className="w-3.5 h-3.5 text-brand" />
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/dashboard/pos" className="btn-primary text-center !py-2.5 !text-xs">
              New Sale
            </Link>
            <Link to="/dashboard/repairs" className="btn-dark text-center !py-2.5 !text-xs">
              New Repair
            </Link>
            <Link to="/dashboard/products" className="btn-outline text-center !py-2.5 !text-xs">
              Add Product
            </Link>
            <Link to="/dashboard/expenses" className="btn-outline text-center !py-2.5 !text-xs">
              Add Expense
            </Link>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="db-card space-y-3">
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
            <p className="text-xs text-muted-foreground font-medium py-6 text-center">
              No sales recorded today.
            </p>
          ) : (
            <ul className="space-y-0 divide-y divide-border">
              {data.recentSales.map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-ink">{s.invoice_number}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(s.customers as { name: string } | null)?.name || "Walk-in Customer"}
                    </div>
                  </div>
                  <span className="font-extrabold text-ink tabular-nums">
                    {formatGBP((s.total_pence ?? 0) / 100)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
