import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-2 border-b border-border/50">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <Skeleton
              key={cIdx}
              className={`h-4 ${
                cIdx === 0 ? "w-1/4" : cIdx === cols - 1 ? "w-16 ml-auto" : "w-1/6"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="db-card p-4 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-3/4" />
        </div>
      ))}
    </div>
  );
}
