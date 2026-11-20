import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import socketService from "@/lib/socket";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { addNotificationToCache, markReadInCache } from "@/hooks/use-notifications";
import { toAppLink } from "@/lib/notification-link";
import type { INotification } from "@/types/api.type";

/**
 * Listens for notifications pushed over the socket: adds them to the cached
 * lists (badge, bell, page update instantly) and shows a toast. Also keeps
 * read state in sync when the user reads notifications in another tab.
 * Mount once (AuthProvider).
 */
const useNotificationSocket = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const offNew = socketService.on(
      "notification:new",
      ({ notification }: { notification: INotification }) => {
        if (!notification?._id) return;
        addNotificationToCache(queryClient, notification);
        // Event reminders get their own toast (Join / Snooze), see useCalendarSocket
        if (notification.type === "EVENT_REMINDER") return;

        const link = toAppLink(notification.link);
        toast({
          title: notification.sender?.name
            ? `New from ${notification.sender.name}`
            : "New notification",
          description: notification.message,
          duration: 6000,
          action: link ? (
            <ToastAction altText="View notification" onClick={() => navigate(link)}>
              View
            </ToastAction>
          ) : undefined,
        });
      }
    );

    const offRead = socketService.on(
      "notification:read",
      (payload: { notificationIds?: string[]; workspaceId?: string; all?: boolean }) => {
        markReadInCache(queryClient, payload);
      }
    );

    return () => {
      offNew();
      offRead();
    };
  }, [queryClient, navigate]);
};

export default useNotificationSocket;
