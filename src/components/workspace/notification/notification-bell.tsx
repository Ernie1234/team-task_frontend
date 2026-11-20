import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import useWorkspaceId from "@/hooks/use-workspace-id";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationsAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { toAppLink } from "@/lib/notification-link";
import type { INotification } from "@/types/api.type";

const MAX_ITEMS = 10;

const NotificationBell = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useNotifications(workspaceId);
  const { mutate: markAsRead } = useMarkNotificationsAsRead(workspaceId);
  const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleOpen = (notification: INotification) => {
    if (!notification.isRead) markAsRead([notification._id]);
    const link = toAppLink(notification.link);
    setOpen(false);
    if (link) navigate(link);
  };

  if (!workspaceId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAllAsRead(workspaceId)}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, MAX_ITEMS).map((notification) => (
                <li key={notification._id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(notification)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      !notification.isRead && "bg-primary/5"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={notification.sender?.profilePicture}
                        alt={notification.sender?.name}
                      />
                      <AvatarFallback className="text-xs">
                        {(notification.sender?.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          notification.isRead ? "text-muted-foreground" : "font-medium"
                        )}
                      >
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link to={`/workspace/${workspaceId}/notifications`} onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
