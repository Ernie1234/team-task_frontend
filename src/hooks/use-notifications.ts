// hooks/api/use-notifications.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationsAsRead, markAllNotificationsAsRead } from "@/lib/api";

// Mark specific notifications as read
export const useMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsAsRead,
    onSuccess: () => {
      // Invalidate workspace data to refresh notifications
      queryClient.invalidateQueries({
        queryKey: ["workspace"],
      });
    },
    onError: (error) => {
      console.error("Failed to mark notifications as read:", error);
    },
  });
};

// Mark all notifications as read for a workspace
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      // Invalidate workspace data to refresh notifications
      queryClient.invalidateQueries({
        queryKey: ["workspace"],
      });
    },
    onError: (error) => {
      console.error("Failed to mark notifications as read:", error);
    },
  });
};
