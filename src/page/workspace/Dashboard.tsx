import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import useCreateProjectDialog from "@/hooks/use-create-project-dialog";
import WorkspaceAnalytics from "@/components/workspace/workspace-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecentProjects from "@/components/workspace/project/recent-projects";
import RecentTasks from "@/components/workspace/task/recent-tasks";
import RecentMembers from "@/components/workspace/member/recent-members";
import RecentActivites from "@/components/workspace/common/RecentActivites";

const WorkspaceDashboard = () => {
  const { onOpen } = useCreateProjectDialog();
  return (
    <main className="flex flex-1 flex-col py-4 md:pt-3">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Workspace Overview
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview for this workspace!
          </p>
        </div>
        <Button onClick={onOpen}>
          <Plus />
          New Project
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col w-full lg:w-8/12">
          <WorkspaceAnalytics />
          <div className="mt-4">
            <Tabs
              defaultValue="projects"
              className="w-full border rounded-lg p-2"
            >
              <TabsList className="w-full justify-start border-0 px-1 h-12">
                <TabsTrigger className="py-2" value="projects">
                  Recent Projects
                </TabsTrigger>
                <TabsTrigger className="py-2" value="tasks">
                  Recent Tasks
                </TabsTrigger>
                <TabsTrigger className="py-2" value="members">
                  Recent Members
                </TabsTrigger>
              </TabsList>
              <TabsContent value="projects">
                <RecentProjects />
              </TabsContent>
              <TabsContent value="tasks">
                <RecentTasks />
              </TabsContent>
              <TabsContent value="members">
                <RecentMembers />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="flex w-full lg:w-4/12">
          <RecentActivites title="Recent Activities" />
        </div>
      </div>
    </main>
  );
};

export default WorkspaceDashboard;
