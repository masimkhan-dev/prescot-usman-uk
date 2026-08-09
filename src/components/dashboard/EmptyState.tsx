import { ReactNode } from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3 border border-border/50">
        {icon || <FolderOpen className="w-6 h-6 text-brand" />}
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
