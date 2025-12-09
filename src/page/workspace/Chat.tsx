import React from "react";
import ChatLayout from "@/components/chat/ChatLayout";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useParams } from "react-router-dom";

const WorkspaceChat: React.FC = () => {
  const workspaceId = useWorkspaceId();
  const { projectId } = useParams();

  return (
    <main className="flex flex-1 flex-col py-4 md:pt-3">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {projectId ? "Project Chat" : "Workspace Chat"}
          </h2>
          <p className="text-muted-foreground">
            {projectId 
              ? "Communicate with your project team members" 
              : "Communicate with workspace members and teams"
            }
          </p>
        </div>
      </div>

      <div className="flex-1">
        <ChatLayout
          workspaceId={workspaceId}
          projectId={projectId}
          className="h-[calc(100vh-200px)]"
        />
      </div>
    </main>
  );
};

export default WorkspaceChat;