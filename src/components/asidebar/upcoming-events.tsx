import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, startOfMinute } from "date-fns";
import { CalendarPlus, Plus } from "lucide-react";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCalendarConnection, useEvents } from "@/hooks/api/use-calendar";
import useEventDialog from "@/hooks/use-event-dialog";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { calendarConnectUrl } from "@/lib/api";
import { relativeStart } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/** Notion-style "Upcoming events" in the sidebar */
export function UpcomingEvents() {
  const workspaceId = useWorkspaceId();
  const { data: connection } = useCalendarConnection();
  const { openEvent, openNew } = useEventDialog();
  // A stable window (re-computed when the component remounts); cache key stays the same between renders
  const [range] = useState(() => {
    const from = startOfMinute(new Date());
    return { from, to: addDays(from, 7) };
  });
  const { data: events = [] } = useEvents(range.from, range.to);
  const upcoming = useMemo(() => events.filter((e) => new Date(e.end) > new Date()).slice(0, 4), [events]);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="w-full justify-between pr-0">
        <Link to={`/workspace/${workspaceId}/calendar`} className="hover:text-foreground">
          Upcoming events
        </Link>
        <button
          type="button"
          aria-label="New event"
          onClick={() => openNew()}
          className="flex size-5 items-center justify-center rounded-full border"
        >
          <Plus className="size-3.5" />
        </button>
      </SidebarGroupLabel>
      <SidebarMenu>
        {upcoming.map((event) => (
          <SidebarMenuItem key={event._id}>
            <SidebarMenuButton onClick={() => openEvent(event)} className="h-auto py-1.5">
              <span className={cn("h-7 w-1 shrink-0 rounded-full", event.source === "google" ? "bg-sky-500" : "bg-primary")} />
              <span className="min-w-0">
                <span className="block truncate text-sm">{event.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{relativeStart(event)}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {upcoming.length === 0 && connection?.connected && (
          <li className="px-2 py-1 text-xs text-muted-foreground">Nothing in the next 7 days</li>
        )}
        {connection && !connection.connected && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={calendarConnectUrl(workspaceId)}>
                <CalendarPlus />
                <span>Connect your calendar</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
