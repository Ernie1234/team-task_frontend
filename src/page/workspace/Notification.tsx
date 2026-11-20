import { PageHeader } from "@/components/shared/page-header";
import { NotificationTable } from "@/components/workspace/notification/notification-table";
import {
  useMarkAllNotificationsAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const NotificationPage = () => {
  const workspaceId = useWorkspaceId();
  const { data, isLoading, isError, refetch } = useNotifications(workspaceId);
  const { mutate: markAllAsRead, isPending } = useMarkAllNotificationsAsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Notifications"
        description={
          notifications.length === 0
            ? "Task assignments, mentions and team activity will show up here."
            : unreadCount > 0
              ? `${unreadCount} unread of ${notifications.length}`
              : "You're all caught up"
        }
        actions={
          unreadCount > 0 && (
            <Button onClick={() => markAllAsRead(workspaceId)} disabled={isPending} variant="outline" className="h-9 gap-1.5">
              <CheckCircle className="h-4 w-4" />
              {isPending ? "Marking…" : "Mark all as read"}
            </Button>
          )
        }
      />
      <div className="space-y-5">
        {isError ? (
          <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
            Couldn't load notifications.{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <NotificationTable data={notifications} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
