import { useParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import ProjectAnalytics from "@/components/workspace/project/project-analytics";
import ProjectHeader from "@/components/workspace/project/project-header";
import TaskWorkspace from "@/components/workspace/task/views/task-workspace";
import useWorkspaceId from "@/hooks/use-workspace-id";

const ProjectDetails = () => {
  const workspaceId = useWorkspaceId();
  const { projectId } = useParams();

  return (
    <div className="w-full space-y-6">
      <ProjectHeader />
      <div className="space-y-6">
        <ProjectAnalytics />
        <Separator />
        <TaskWorkspace workspaceId={workspaceId} projectId={projectId} title="Project tasks" />
      </div>
    </div>
  );
};

export default ProjectDetails;
