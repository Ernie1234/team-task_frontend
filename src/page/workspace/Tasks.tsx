import TaskWorkspace from "@/components/workspace/task/views/task-workspace";
import useWorkspaceId from "@/hooks/use-workspace-id";

export default function Tasks() {
  const workspaceId = useWorkspaceId();
  return (
    <div className="w-full pt-3">
      <TaskWorkspace workspaceId={workspaceId} />
    </div>
  );
}
