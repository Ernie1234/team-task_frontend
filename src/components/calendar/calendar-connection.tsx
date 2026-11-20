import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CalendarDays, Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCalendarConnection, useDisconnectCalendar, useSyncCalendar } from "@/hooks/api/use-calendar";
import { calendarConnectUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Google Calendar status for the calendar header: connect, sync now, disconnect */
export function CalendarConnectionControl({ workspaceId }: { workspaceId: string }) {
  const { data: connection, isLoading } = useCalendarConnection();
  const sync = useSyncCalendar();
  const disconnect = useDisconnectCalendar();

  if (isLoading) return null;
  if (!connection?.connected) {
    return (
      <Button asChild variant="outline" className="h-9 gap-1.5">
        <a href={calendarConnectUrl(workspaceId)}>
          <CalendarDays className="h-4 w-4" /> Connect Google Calendar
        </a>
      </Button>
    );
  }

  const broken = connection.status === "error";
  return (
    <div className="flex items-center gap-1">
      {broken ? (
        <Button asChild variant="outline" className="h-9 gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
          <a href={calendarConnectUrl(workspaceId)}>
            <AlertTriangle className="h-4 w-4" /> Reconnect Google
          </a>
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="h-9 gap-1.5 text-muted-foreground"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          title={connection.lastSyncedAt ? `Synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}` : "Not synced yet"}
        >
          {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="hidden lg:inline">
            {sync.isPending ? "Syncing…" : connection.lastSyncedAt ? `Synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}` : "Sync now"}
          </span>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Calendar connection">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-xs text-muted-foreground">Google Calendar</span>
            <span className="block truncate text-sm">{connection.email || "Connected"}</span>
            {connection.lastError && <span className={cn("mt-1 block text-xs", broken ? "text-amber-600" : "text-muted-foreground")}>{connection.lastError}</span>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => sync.mutate()} disabled={sync.isPending || broken}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sync now
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => disconnect.mutate()}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
