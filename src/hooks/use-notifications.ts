import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getWorkspaceNotificationsQueryFn,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
} from "@/lib/api";
import type { INotification } from "@/types/api.type";

export type NotificationsCache = {
  notifications: INotification[];
  unreadCount: number;
};

export const notificationsQueryKey = (workspaceId: string) =>
  ["notifications", workspaceId] as const;

// The current user's notifications for a workspace (newest first) + unread count
export const useNotifications = (workspaceId?: string) =>
  useQuery<NotificationsCache>({
    queryKey: notificationsQueryKey(workspaceId ?? ""),
    queryFn: async () => {
      const response = await getWorkspaceNotificationsQueryFn(workspaceId!);
      return { notifications: response.data, unreadCount: response.unreadCount };
    },
    enabled: !!workspaceId,
    // New notifications arrive over the socket; this is only a safety net
    staleTime: 60_000,
  });

const withReadState = (
  cache: NotificationsCache,
  isRead: (notification: INotification) => boolean
): NotificationsCache => {
  const notifications = cache.notifications.map((notification) =>
    !notification.isRead && isRead(notification)
      ? { ...notification, isRead: true }
      : notification
  );
  const newlyRead = notifications.filter(
    (notification, index) => notification.isRead && !cache.notifications[index].isRead
  ).length;
  return { notifications, unreadCount: Math.max(0, cache.unreadCount - newlyRead) };
};

/** Mark notifications read in every cached workspace list (used by the socket listener too). */
export const markReadInCache = (
  queryClient: QueryClient,
  { notificationIds, workspaceId, all }: { notificationIds?: string[]; workspaceId?: string; all?: boolean }
) => {
  if (all && workspaceId) {
    queryClient.setQueryData<NotificationsCache>(
      notificationsQueryKey(workspaceId),
      (cache) => cache && { notifications: cache.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }
    );
    return;
  }

  const ids = new Set(notificationIds ?? []);
  if (ids.size === 0) return;
  queryClient.setQueriesData<NotificationsCache>(
    { queryKey: ["notifications"] },
    (cache) => cache && withReadState(cache, (notification) => ids.has(notification._id))
  );
};

/** Put a live notification at the top of its workspace list. */
export const addNotificationToCache = (
  queryClient: QueryClient,
  notification: INotification
) => {
  if (!notification.workspaceId) {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    return;
  }

  const key = notificationsQueryKey(String(notification.workspaceId));
  if (!queryClient.getQueryData(key)) {
    // Not loaded yet: the next fetch will include it
    queryClient.invalidateQueries({ queryKey: key });
    return;
  }

  queryClient.setQueryData<NotificationsCache>(key, (cache) => {
    if (!cache || cache.notifications.some((n) => n._id === notification._id)) return cache;
    return {
      notifications: [notification, ...cache.notifications],
      unreadCount: cache.unreadCount + (notification.isRead ? 0 : 1),
    };
  });
};

// Mark specific notifications as read (optimistic)
export const useMarkNotificationsAsRead = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsAsRead,
    onMutate: async (notificationIds: string[]) => {
      const key = notificationsQueryKey(workspaceId ?? "");
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationsCache>(key);
      markReadInCache(queryClient, { notificationIds });
      return { previous };
    },
    onError: (error, _ids, context) => {
      console.error("Failed to mark notifications as read:", error);
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey(workspaceId ?? ""), context.previous);
      }
    },
  });
};

// Mark all of the user's notifications in a workspace as read (optimistic)
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async (workspaceId: string) => {
      const key = notificationsQueryKey(workspaceId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationsCache>(key);
      markReadInCache(queryClient, { workspaceId, all: true });
      return { previous };
    },
    onError: (error, workspaceId, context) => {
      console.error("Failed to mark all notifications as read:", error);
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey(workspaceId), context.previous);
      }
    },
  });
};
