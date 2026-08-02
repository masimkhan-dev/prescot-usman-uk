import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getReports } from "@/lib/reports.functions";
import { DashboardStatCards } from "@/components/dashboard/StatCards";
import { formatGBP } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => getReports() });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Monthly and daily profit overview.</p>
      </div>

      <DashboardStatCards
        stats={[
          { label: "This Month Sales", value: formatGBP(data?.totalMonthSales || 0), change: "Month" },
          { label: "This Month Expenses", value: formatGBP(data?.totalMonthExpenses || 0), change: "Month" },
          { label: "Monthly Profit", value: formatGBP(data?.profitMonth || 0), change: "Sales - Expenses" },
          { label: "Today's Profit", value: formatGBP(data?.profitToday || 0), change: "Today" },
        ]}
      />

      <div className="bg-background border border-border rounded-xl p-5">
        <h2 className="font-semibold text-ink">Sales by Day (This Month)</h2>
        {data?.salesByDay.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No sales recorded this month.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data?.salesByDay.map((d) => (
              <li key={d.date} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{d.date}</span>
                <span className="font-semibold text-ink">{formatGBP(d.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
