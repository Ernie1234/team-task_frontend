import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendarConnection, useDisconnectCalendar, useSyncCalendar } from "@/hooks/api/use-calendar";
import { calendarConnectUrl } from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { Group, SettingRow } from "./settings-ui";

/** Settings → Calendar: connect Google Calendar, sync, disconnect */
export default function CalendarSection() {
  const workspaceId = useWorkspaceId();
  const { data: connection, isLoading } = useCalendarConnection();
  const sync = useSyncCalendar();
  const disconnect = useDisconnectCalendar();

  return (
    <div>
      <div className="pb-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">See your meetings next to your tasks, add events from Team Task, and get reminders.</p>
      </div>
      <Group title="Google Calendar">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !connection?.connected ? (
          <div className="rounded-xl border border-dashed p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Connect Google Calendar</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Two-way sync: events from Google show up here, and events you create here are added to Google. Only you see your calendar.
                </p>
                <Button asChild className="mt-3 h-9">
                  <a href={calendarConnectUrl(workspaceId)}>Connect Google Calendar</a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            <SettingRow title="Connected account" description={connection.email || "Google Calendar"}>
              {connection.status === "error" ? (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-amber-600">
                  <a href={calendarConnectUrl(workspaceId)}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Reconnect
                  </a>
                </Button>
              ) : (
                <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
              )}
            </SettingRow>
            <SettingRow
              title="Sync"
              description={
                connection.lastError
                  ? connection.lastError
                  : connection.lastSyncedAt
                    ? `Last synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}. Syncs every 5 minutes.`
                    : "Not synced yet"
              }
            >
              <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={sync.isPending || connection.status === "error"} onClick={() => sync.mutate()}>
                {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now
              </Button>
            </SettingRow>
            <SettingRow title="Disconnect" description="Removes imported Google events from Team Task. Your own events stay.">
              <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                Disconnect
              </Button>
            </SettingRow>
          </div>
        )}
      </Group>
    </div>
  );
}
