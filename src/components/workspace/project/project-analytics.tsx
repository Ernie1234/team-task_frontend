import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getProjectAnalyticsQueryFn } from "@/lib/api";
import { StatCard } from "@/components/shared/stat-card";

const ProjectAnalytics = () => {
  const projectId = useParams().projectId as string;
  const workspaceId = useWorkspaceId();

  const { data, isPending } = useQuery({
    queryKey: ["project-analytics", projectId],
    queryFn: () => getProjectAnalyticsQueryFn({ workspaceId, projectId }),
    staleTime: 0,
    enabled: !!projectId,
  });

  const a = data?.analytics;
  const total = a?.totalTasks ?? 0;
  const done = a?.completedTasks ?? 0;
  const overdue = a?.overdueTasks ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Tasks" value={total} hint={`${Math.max(0, total - done)} still open`} icon={ListTodo} tone="text-sky-500 bg-sky-500/10" isLoading={isPending} />
      <StatCard label="Overdue" value={overdue} hint={overdue ? "Needs attention" : "Nothing late"} icon={AlertTriangle} tone="text-red-500 bg-red-500/10" alert={overdue > 0} isLoading={isPending} />
      <StatCard
        label="Completed"
        value={done}
        hint={total ? `${Math.round((done / total) * 100)}% of tasks` : "No tasks yet"}
        icon={CheckCircle2}
        tone="text-emerald-500 bg-emerald-500/10"
        isLoading={isPending}
      />
    </div>
  );
};

export default ProjectAnalytics;
