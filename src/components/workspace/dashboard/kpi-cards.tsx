import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardType } from "@/types/api.type";

type Kpi = {
  label: string;
  value: number;
  hint: string;
  icon: typeof CircleDashed;
  to: string;
  tone: string;
  alert?: boolean;
};

const Sparkline = ({ data }: { data: { date: string; count: number }[] }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden>
      {data.map((d, i) => (
        <span
          key={d.date}
          className={cn("w-1.5 rounded-sm", i === data.length - 1 ? "bg-emerald-500" : "bg-emerald-500/40")}
          style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }}
        />
      ))}
    </div>
  );
};

/** Headline numbers; each opens the task list already filtered to those tasks. */
const KpiCards = ({ workspaceId, data, isLoading }: { workspaceId: string; data?: DashboardType; isLoading: boolean }) => {
  const t = data?.totals;
  const base = `/workspace/${workspaceId}/tasks`;
  const kpis: Kpi[] = [
    {
      label: "Open tasks",
      value: t?.open ?? 0,
      hint: `${t?.inProgress ?? 0} in progress`,
      icon: CircleDashed,
      to: `${base}`,
      tone: "text-sky-500 bg-sky-500/10",
    },
    {
      label: "Due today",
      value: t?.dueToday ?? 0,
      hint: "Across the workspace",
      icon: CalendarClock,
      to: `${base}?quick=today`,
      tone: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Overdue",
      value: t?.overdue ?? 0,
      hint: t?.overdue ? "Needs attention" : "Nothing late",
      icon: AlertTriangle,
      to: `${base}?quick=overdue&sort=due`,
      tone: "text-red-500 bg-red-500/10",
      alert: (t?.overdue ?? 0) > 0,
    },
    {
      label: "Done this week",
      value: t?.completedThisWeek ?? 0,
      hint: `${t?.completionRate ?? 0}% of all tasks done`,
      icon: CheckCircle2,
      to: `${base}?status=DONE`,
      tone: "text-emerald-500 bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Link
          key={kpi.label}
          to={kpi.to}
          className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            kpi.alert && "border-red-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{kpi.label}</span>
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", kpi.tone)}>
              <kpi.icon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className={cn("text-3xl font-bold tabular-nums tracking-tight", kpi.alert && "text-red-500")}>
                {isLoading ? <span className="inline-block h-8 w-10 animate-pulse rounded bg-muted" /> : kpi.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
            </div>
            {kpi.label === "Done this week" && data && <Sparkline data={data.completedByDay} />}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default KpiCards;
