import { createElement, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEventMutationFn,
  deleteEventMutationFn,
  disconnectCalendarMutationFn,
  getCalendarConnectionQueryFn,
  getEventsQueryFn,
  snoozeEventMutationFn,
  syncCalendarMutationFn,
  updateEventMutationFn,
} from "@/lib/api";
import socketService from "@/lib/socket";
import { toast } from "@/hooks/use-toast";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import type { CalendarEventType, EventPayloadType } from "@/types/api.type";

export const calendarKeys = {
  connection: ["calendar", "connection"] as const,
  events: (from: Date, to: Date) => ["calendar", "events", from.toISOString(), to.toISOString()] as const,
  allEvents: ["calendar", "events"] as const,
};

export const useCalendarConnection = () =>
  useQuery({
    queryKey: calendarKeys.connection,
    queryFn: getCalendarConnectionQueryFn,
    staleTime: 60_000,
    select: (data) => data.connection,
  });

export const useEvents = (from: Date, to: Date, enabled = true) =>
  useQuery({
    queryKey: calendarKeys.events(from, to),
    queryFn: () => getEventsQueryFn(from, to),
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    select: (data) => data.events,
  });

const useRefreshCalendar = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["calendar"] });
};

const errorToast = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "destructive" });

export const useSyncCalendar = () => {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: syncCalendarMutationFn,
    onSuccess: refresh,
    onError: (error: Error) => {
      refresh();
      errorToast("Couldn't sync with Google Calendar")(error);
    },
  });
};

export const useDisconnectCalendar = () => {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: disconnectCalendarMutationFn,
    onSuccess: () => {
      refresh();
      toast({ title: "Google Calendar disconnected", description: "Imported events were removed. Your own events are still here." });
    },
    onError: errorToast("Couldn't disconnect"),
  });
};

export const useCreateEvent = () => {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: (data: EventPayloadType) => createEventMutationFn(data),
    onSuccess: ({ event }) => {
      refresh();
      if (event.syncError) toast({ title: "Saved here, but not in Google Calendar", description: event.syncError, variant: "destructive" });
    },
    onError: errorToast("Couldn't create the event"),
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: updateEventMutationFn,
    // Move it on screen straight away (drag, quick edits)
    onMutate: async ({ eventId, data }) => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.allEvents });
      const snapshot = queryClient.getQueriesData<{ events: CalendarEventType[] }>({ queryKey: calendarKeys.allEvents });
      queryClient.setQueriesData<{ events: CalendarEventType[] }>({ queryKey: calendarKeys.allEvents }, (cache) =>
        cache && { events: cache.events.map((e) => (e._id === eventId ? { ...e, ...data } as CalendarEventType : e)) }
      );
      return { snapshot };
    },
    onError: (error: Error, _vars, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      errorToast("Couldn't save the event")(error);
    },
    onSuccess: ({ event }) => {
      if (event.syncError) toast({ title: "Saved here, but not in Google Calendar", description: event.syncError, variant: "destructive" });
    },
    onSettled: refresh,
  });
};

export const useDeleteEvent = () => {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: deleteEventMutationFn,
    onSuccess: refresh,
    onError: errorToast("Couldn't delete the event"),
  });
};

const showDesktopAlert = (event: CalendarEventType, when: string, onClick: () => void) => {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  // In-app toast is enough while the tab is in front
  if (document.visibilityState === "visible" && document.hasFocus()) return;
  const alert = new Notification(event.title, { body: `Starts ${when}${event.location ? ` · ${event.location}` : ""}`, tag: `event-${event._id}` });
  alert.onclick = () => {
    window.focus();
    onClick();
    alert.close();
  };
};

/**
 * Live calendar updates + reminders. Mounted once for the signed-in app:
 * a reminder shows a toast (Join / Snooze) and, if the tab is in the
 * background and alerts are allowed, a desktop notification.
 */
export const useCalendarSocket = (workspaceId?: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const offChanged = socketService.on("calendar:changed", () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    });

    const offReminder = socketService.on("event:reminder", ({ event, when }: { event: CalendarEventType; when: string }) => {
      const open = () => workspaceId && navigate(`/workspace/${workspaceId}/calendar?event=${event._id}`);
      showDesktopAlert(event, when, open);
      const snooze = () =>
        snoozeEventMutationFn({ eventId: event._id, minutes: 5 }).then(
          () => toast({ title: "Snoozed for 5 minutes" }),
          () => toast({ title: "Couldn't snooze", variant: "destructive" })
        );
      toast({
        title: `⏰ ${event.title}`,
        description: `Starts ${when}${event.location ? ` · ${event.location}` : ""}`,
        duration: 60_000,
        action: createElement(
          "div",
          { className: "flex shrink-0 flex-col gap-1.5" },
          event.meetLink
            ? createElement(ToastAction, { altText: "Join the meeting", onClick: () => window.open(event.meetLink!, "_blank", "noopener") }, "Join")
            : createElement(ToastAction, { altText: "Open the event", onClick: open }, "Open"),
          createElement(ToastAction, { altText: "Snooze for 5 minutes", onClick: snooze }, "Snooze 5m")
          // Two actions in one slot: the toast renders whatever element it's given
        ) as unknown as ToastActionElement,
      });
    });

    return () => {
      offChanged();
      offReminder();
    };
  }, [queryClient, navigate, workspaceId]);
};
