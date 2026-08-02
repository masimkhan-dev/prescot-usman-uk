import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardStatCards } from "@/components/dashboard/StatCards";
import { getDashboardSummary } from "@/lib/dashboard.functions";
import { formatGBP } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getDashboardSummary(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-red-700 bg-red-50 rounded-lg">
        Failed to load dashboard summary. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Today's snapshot of your business.</p>
      </div>

      <DashboardStatCards
        stats={[
          { label: "Today's Sales", value: formatGBP(data.todaySales), change: "Today" },
          { label: "Pending Repairs", value: data.pendingRepairs, change: "Tickets" },
          { label: "Low Stock Items", value: data.lowStock, change: "Products" },
          { label: "Today's Expenses", value: formatGBP(data.todayExpenses), change: "Today" },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="font-semibold text-ink">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/dashboard/pos" className="btn-primary text-center">New Sale</Link>
            <Link to="/dashboard/repairs" className="btn-dark text-center">New Repair</Link>
            <Link to="/dashboard/products" className="btn-outline text-center">Add Product</Link>
            <Link to="/dashboard/expenses" className="btn-outline text-center">Add Expense</Link>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="font-semibold text-ink">Recent Sales</h2>
          {data.recentSales.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No sales today.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.recentSales.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {(s.customers as { name: string } | null)?.name || "Walk-in"} — {s.payment_method}
                  </span>
                  <span className="font-semibold text-ink">{formatGBP(s.total)}</span>
                </li>
              ))}
            </ul>

          )}
        </div>
      </div>
    </div>
  );
}
