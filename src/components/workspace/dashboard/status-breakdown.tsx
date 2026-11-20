import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from "@/lib/task-meta";
import type { DashboardType } from "@/types/api.type";
import { PriorityFlag } from "../task/views/task-pickers";

/** Where all the work stands: one stacked bar plus counts per status and open priority. */
const StatusBreakdown = ({ workspaceId, data, isLoading }: { workspaceId: string; data?: DashboardType; isLoading: boolean }) => {
  const total = data?.totals.total ?? 0;
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Status</CardTitle>
        <p className="text-xs text-muted-foreground">
          {total} tasks · {data?.totals.completionRate ?? 0}% complete
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Tasks by status">
              {STATUS_ORDER.map((status) => {
                const count = data?.byStatus[status] ?? 0;
                return count ? (
                  <span
                    key={status}
                    className={STATUS_META[status].dot}
                    style={{ width: `${(count / Math.max(total, 1)) * 100}%` }}
                    title={`${STATUS_META[status].label}: ${count}`}
                  />
                ) : null;
              })}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {STATUS_ORDER.map((status) => (
                <li key={status}>
                  <Link
                    to={`/workspace/${workspaceId}/tasks?status=${status}`}
                    className="flex items-center gap-2 rounded-md text-sm hover:underline"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].dot}`} />
                    <span className="flex-1 text-muted-foreground">{STATUS_META[status].label}</span>
                    <span className="tabular-nums font-medium">{data?.byStatus[status] ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
              <span>Open by priority</span>
              {PRIORITY_ORDER.map((p) => (
                <Link key={p} to={`/workspace/${workspaceId}/tasks?priority=${p}`} className="flex items-center gap-1 hover:text-foreground" title={PRIORITY_META[p].label}>
                  <PriorityFlag priority={p} /> <span className="tabular-nums">{data?.byPriority[p] ?? 0}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusBreakdown;
