import NotificationHeader from "@/components/workspace/notification/notification-header";
import { NotificationTable } from "@/components/workspace/notification/notification-table";
import { useAuthContext } from "@/context/auth-provider";
import { useMarkAllNotificationsAsRead } from "@/hooks/use-notifications";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const NotificationPage = () => {
  const { workspace, refetchWorkspace } = useAuthContext();
  const workspaceId = useWorkspaceId();
  const { mutate: markAllAsRead, isPending } = useMarkAllNotificationsAsRead();

  const notifications = workspace?.notifications || [];
  const unreadNotifications = notifications.filter(
    (notification) => !notification.isRead
  );

  const handleMarkAllRead = () => {
    if (workspaceId && unreadNotifications.length > 0) {
      markAllAsRead(workspaceId, {
        onSuccess: () => {
          refetchWorkspace();
        },
      });
    }
  };

  return (
    <div className="w-full space-y-6 py-4 md:pt-3">
      <div className="flex items-center justify-between">
        <NotificationHeader />
        {unreadNotifications.length > 0 && (
          <Button
            onClick={handleMarkAllRead}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {isPending ? "Marking..." : "Mark all as read"}
          </Button>
        )}
      </div>
      <div className="space-y-5">
        <NotificationTable data={notifications} />
      </div>
    </div>
  );
};

export default NotificationPage;
