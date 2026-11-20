 
import { useQuery } from "@tanstack/react-query";
import { getWorkspaceByIdQueryFn } from "@/lib/api";
import { CustomError } from "@/types/custom-error.type";
import { IWorkspace } from "@/types/api.type";

interface WorkspaceResponse {
  workspaceWithMembers: IWorkspace;
}

const useGetWorkspaceQuery = (workspaceId: string) => {
  const query = useQuery<WorkspaceResponse, CustomError>({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspaceByIdQueryFn(workspaceId),
    staleTime: 0,
    // Retrying won't help if the user isn't a member of this workspace
    retry: (failureCount, error) =>
      error?.errorCode !== "ACCESS_UNAUTHORIZED" && failureCount < 2,
    enabled: !!workspaceId,
  });

  return query;
};

export default useGetWorkspaceQuery;
