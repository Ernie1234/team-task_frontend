import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PresenceDot from "@/components/presence/presence-dot";
import { cn } from "@/lib/utils";
import type { DashboardType } from "@/types/api.type";
import { AssigneeAvatar } from "../task/views/task-pickers";

/** Who has how much: open tasks per person, so work can be balanced. */
const TeamWorkload = ({ workspaceId, data, isLoading }: { workspaceId: string; data?: DashboardType; isLoading: boolean }) => {
  const team = data?.team ?? [];
  const max = Math.max(1, ...team.map((m) => m.open));

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Team workload</CardTitle>
        <p className="text-xs text-muted-foreground">Open tasks per person</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <ul className="space-y-1">
            {team.map((member) => (
              <li key={member._id}>
                <Link
                  to={`/workspace/${workspaceId}/tasks?assignee=${member._id}`}
                  className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/60"
                  title={`${member.name}: ${member.open} open, ${member.inProgress} in progress, ${member.overdue} overdue`}
                >
                  <span className="relative">
                    <AssigneeAvatar user={member} size="md" />
                    <PresenceDot userId={member._id} fallbackOnline={member.isOnline} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm">{member.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {member.open}
                        {member.overdue > 0 && <span className="ml-1 text-red-500">· {member.overdue} late</span>}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full rounded-full bg-gradient-to-r from-primary to-primary-2", member.open === 0 && "opacity-0")}
                        style={{ width: `${(member.open / max) * 100}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamWorkload;
