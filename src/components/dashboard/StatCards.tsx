export function DashboardStatCards({
  stats,
}: {
  stats: { label: string; value: string | number; change: string }[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-xl p-3.5 sm:p-4 border-l-4 border-l-brand hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
            {stat.label}
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-ink tabular-nums tracking-tight truncate">
            {stat.value}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground font-medium truncate">
            {stat.change}
          </div>
        </div>
      ))}
    </div>
  );
}

