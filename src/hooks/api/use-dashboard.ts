import { useQuery } from "@tanstack/react-query";
import { getWorkspaceDashboardQueryFn } from "@/lib/api";

// Refreshed automatically when tasks change (see useTaskSocket / task mutations)
const useDashboard = (workspaceId?: string) =>
  useQuery({
    queryKey: ["dashboard", workspaceId],
    queryFn: () => getWorkspaceDashboardQueryFn(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

export default useDashboard;
