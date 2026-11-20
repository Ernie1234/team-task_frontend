import ChatLayout from "@/components/chat/ChatLayout";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useParams } from "react-router-dom";

const WorkspaceChat = () => {
  const workspaceId = useWorkspaceId();
  const { projectId } = useParams();

  return (
    // Everything below the 3rem app header
    <main className="h-[calc(100svh-3rem)] min-h-[440px]">
      <ChatLayout workspaceId={workspaceId} projectId={projectId} />
    </main>
  );
};

export default WorkspaceChat;
