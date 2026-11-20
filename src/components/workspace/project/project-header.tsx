import { Link, useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import EditProjectDialog from "./edit-project-dialog";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getProjectByIdQueryFn } from "@/lib/api";
import PermissionsGuard from "@/components/resuable/permission-guard";
import { Permissions } from "@/constant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

const ProjectHeader = () => {
  const projectId = useParams().projectId as string;
  const workspaceId = useWorkspaceId();

  const { data, isPending, isError } = useQuery({
    queryKey: ["singleProject", projectId],
    queryFn: () => getProjectByIdQueryFn({ workspaceId, projectId }),
    staleTime: Infinity,
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });

  const project = data?.project;

  return (
    <PageHeader
      eyebrow="Project"
      icon={project?.emoji || "📊"}
      title={
        isPending ? (
          <span className="inline-block h-8 w-48 animate-pulse rounded-md bg-muted" />
        ) : isError ? (
          "Project unavailable"
        ) : (
          <>
            <span className="truncate">{project?.name || "Untitled project"}</span>
            <PermissionsGuard requiredPermission={Permissions.EDIT_PROJECT}>
              <EditProjectDialog project={project} />
            </PermissionsGuard>
          </>
        )
      }
      description={project?.description || undefined}
      actions={
        <Button variant="outline" className="h-9 gap-1.5" asChild>
          <Link to={`/workspace/${workspaceId}/project/${projectId}/chat`}>
            <MessageCircle className="h-4 w-4" />
            Project chat
          </Link>
        </Button>
      }
    />
  );
};

export default ProjectHeader;
