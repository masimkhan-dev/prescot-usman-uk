export function DashboardStatCards({
  stats,
}: {
  stats: { label: string; value: string | number; change: string }[];
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-background border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
        >
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {stat.label}
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{stat.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{stat.change}</div>
        </div>
      ))}
    </div>
  );
}
