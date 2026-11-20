import useWorkspaceId from "@/hooks/use-workspace-id";
import CalendarView from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  const workspaceId = useWorkspaceId();
  return <CalendarView workspaceId={workspaceId} />;
}
