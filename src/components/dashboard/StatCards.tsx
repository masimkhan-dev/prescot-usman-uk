export function DashboardStatCards({
  stats,
}: {
  stats: { label: string; value: string | number; change: string }[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-xl p-4 border-l-4 border-l-brand hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {stat.label}
          </div>
          <div className="mt-2 text-2xl font-extrabold text-ink tabular-nums">{stat.value}</div>
          <div className="mt-1 text-[11px] text-muted-foreground font-medium">{stat.change}</div>
        </div>
      ))}
    </div>
  );
}
