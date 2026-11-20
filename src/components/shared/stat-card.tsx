import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Number tile, same look as the dashboard's headline cards */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  alert,
  isLoading,
  extra,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  /** e.g. "text-sky-500 bg-sky-500/10" */
  tone: string;
  alert?: boolean;
  isLoading?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded-2xl border bg-card p-4", alert && "border-red-500/40")}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className={cn("text-3xl font-bold tabular-nums tracking-tight", alert && "text-red-500")}>
            {isLoading ? <span className="inline-block h-8 w-10 animate-pulse rounded bg-muted" /> : value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {extra}
      </div>
    </div>
  );
}
