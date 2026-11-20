import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import useCreateProjectDialog from "@/hooks/use-create-project-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecentProjects from "@/components/workspace/project/recent-projects";
import RecentTasks from "@/components/workspace/task/recent-tasks";
import RecentMembers from "@/components/workspace/member/recent-members";
import RecentActivites from "@/components/workspace/common/RecentActivites";
import ChatWidget from "@/components/chat/ChatWidget";
import CreateTaskDialog from "@/components/workspace/task/create-task-dialog";
import { PageHeader } from "@/components/shared/page-header";
import KpiCards from "@/components/workspace/dashboard/kpi-cards";
import MyWork from "@/components/workspace/dashboard/my-work";
import CompletionTrend from "@/components/workspace/dashboard/completion-trend";
import StatusBreakdown from "@/components/workspace/dashboard/status-breakdown";
import TeamWorkload from "@/components/workspace/dashboard/team-workload";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useAuth from "@/hooks/api/use-auth";
import useDashboard from "@/hooks/api/use-dashboard";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// One sentence about what matters today
const summary = (overdue: number, dueToday: number, mine: number) => {
  if (overdue && dueToday) return `${dueToday} due today and ${overdue} overdue across the workspace.`;
  if (overdue) return `${overdue} ${overdue === 1 ? "task is" : "tasks are"} overdue. Worth a look.`;
  if (dueToday) return `${dueToday} ${dueToday === 1 ? "task is" : "tasks are"} due today.`;
  if (mine) return `You have ${mine} open ${mine === 1 ? "task" : "tasks"}. Nothing urgent.`;
  return "Nothing urgent today.";
};

const WorkspaceDashboard = () => {
  const { onOpen } = useCreateProjectDialog();
  const workspaceId = useWorkspaceId();
  const { data: auth } = useAuth();
  const { data, isLoading } = useDashboard(workspaceId);
  const dashboard = data?.dashboard;
  const firstName = auth?.user?.name?.split(" ")[0];

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow={format(new Date(), "EEEE, MMMM d")}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description={
          dashboard
            ? summary(dashboard.totals.overdue, dashboard.totals.dueToday, dashboard.myTasks.length)
            : "Here's what's happening in your workspace."
        }
        actions={
          <>
            <Button variant="outline" onClick={onOpen} className="h-9 gap-1.5">
              <Plus className="h-4 w-4" /> New project
            </Button>
            <CreateTaskDialog />
          </>
        }
      />

      <KpiCards workspaceId={workspaceId} data={dashboard} isLoading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <MyWork workspaceId={workspaceId} tasks={dashboard?.myTasks ?? []} isLoading={isLoading} />
          <CompletionTrend data={dashboard} isLoading={isLoading} />
          <Tabs defaultValue="projects" className="w-full rounded-2xl border bg-card p-2">
            <TabsList className="h-11 w-full justify-start border-0 px-1">
              <TabsTrigger className="py-2" value="projects">
                Recent projects
              </TabsTrigger>
              <TabsTrigger className="py-2" value="tasks">
                Recent tasks
              </TabsTrigger>
              <TabsTrigger className="py-2" value="members">
                Recent members
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
        <div className="flex flex-col gap-4 lg:col-span-4">
          <StatusBreakdown workspaceId={workspaceId} data={dashboard} isLoading={isLoading} />
          <TeamWorkload workspaceId={workspaceId} data={dashboard} isLoading={isLoading} />
          <ChatWidget />
          <RecentActivites title="Recent Activities" />
        </div>
      </div>
    </main>
  );
};

export default WorkspaceDashboard;
