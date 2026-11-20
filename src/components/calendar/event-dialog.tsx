import { useEffect, useMemo, useState } from "react";
import { addDays, addMinutes, differenceInMinutes, format, isSameDay, set as setTime, startOfDay } from "date-fns";
import { AlertTriangle, Bell, CalendarDays, Clock, ExternalLink, Loader2, MapPin, Trash2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useEventDialog from "@/hooks/use-event-dialog";
import { useCalendarConnection, useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/hooks/api/use-calendar";
import { calendarConnectUrl } from "@/lib/api";
import { localTimeZone, REMINDER_OPTIONS } from "@/lib/calendar";
import type { CalendarEventType } from "@/types/api.type";

const TIMES = Array.from({ length: 96 }, (_, i) => i * 15); // minutes since midnight, every 15 min
const timeLabel = (minutes: number) => format(addMinutes(startOfDay(new Date()), minutes), "h:mm a");
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const atMinutes = (day: Date, minutes: number) => setTime(startOfDay(day), { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
const roundUp = (d: Date) => addMinutes(startOfDay(d), Math.ceil(minutesOf(d) / 30) * 30);

type Form = {
  title: string;
  allDay: boolean;
  start: Date;
  end: Date; // exclusive for all-day
  location: string;
  description: string;
  reminderMinutes: number | null;
  syncToGoogle: boolean;
};

const formFrom = (event: CalendarEventType | null, draft: Partial<CalendarEventType> | null): Form => {
  if (event) {
    return {
      title: event.title,
      allDay: event.allDay,
      start: new Date(event.start),
      end: new Date(event.end),
      location: event.location,
      description: event.description,
      reminderMinutes: event.reminderMinutes,
      syncToGoogle: event.syncToGoogle,
    };
  }
  const start = draft?.start ? new Date(draft.start) : roundUp(new Date());
  const allDay = !!draft?.allDay;
  return {
    title: draft?.title ?? "",
    allDay,
    start: allDay ? startOfDay(start) : start,
    end: draft?.end ? new Date(draft.end) : allDay ? addDays(startOfDay(start), 1) : addMinutes(start, 30),
    location: "",
    description: "",
    reminderMinutes: allDay ? null : 10,
    syncToGoogle: true,
  };
};

function DateButton({ value, onChange, label }: { value: Date; onChange: (d: Date) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="h-9 rounded-md border bg-background px-3 text-sm transition-colors hover:bg-muted">
          {format(value, "EEE, MMM d, yyyy")}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(d) => {
            if (d) onChange(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({ value, onChange, label, from = 0 }: { value: number; onChange: (m: number) => void; label: string; from?: number }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {TIMES.filter((m) => m >= from).map((m) => (
        <option key={m} value={m}>
          {timeLabel(m)}
        </option>
      ))}
      {!TIMES.includes(value) && <option value={value}>{timeLabel(value)}</option>}
    </select>
  );
}

/** Create or edit an event (also used for events that come from Google Calendar) */
export default function EventDialog() {
  const { open, event, draft, close } = useEventDialog();
  const workspaceId = useWorkspaceId();
  const { data: connection } = useCalendarConnection();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const [form, setForm] = useState<Form>(() => formFrom(event, draft));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFrom(event, draft));
      setConfirmDelete(false);
    }
  }, [open, event, draft]);

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const connected = connection?.connected && connection.status === "active";
  const fromGoogle = event?.source === "google";
  const duration = useMemo(() => differenceInMinutes(form.end, form.start), [form.start, form.end]);
  const lastDay = addDays(form.end, -1);
  const saving = createEvent.isPending || updateEvent.isPending;

  // Moving the start keeps the length of the event
  const setStart = (start: Date) => patch({ start, end: addMinutes(start, Math.max(duration, form.allDay ? 1440 : 15)) });

  const toggleAllDay = (allDay: boolean) => {
    if (allDay) patch({ allDay, start: startOfDay(form.start), end: addDays(startOfDay(form.start), Math.max(1, Math.round(duration / 1440))) });
    else {
      const start = atMinutes(form.start, 9 * 60);
      patch({ allDay, start, end: addMinutes(start, 60), reminderMinutes: form.reminderMinutes ?? 10 });
    }
  };

  const save = () => {
    const payload = {
      title: form.title.trim() || "Untitled event",
      description: form.description,
      location: form.location.trim(),
      start: form.start.toISOString(),
      end: form.end.toISOString(),
      allDay: form.allDay,
      timeZone: event?.timeZone && fromGoogle ? event.timeZone : localTimeZone(),
      reminderMinutes: form.reminderMinutes,
      ...(fromGoogle ? {} : { syncToGoogle: connected ? form.syncToGoogle : false }),
    };
    if (event) updateEvent.mutate({ eventId: event._id, data: payload }, { onSuccess: close });
    else createEvent.mutate({ ...payload, workspaceId }, { onSuccess: close });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:rounded-2xl">
        <DialogDescription className="sr-only">{event ? "Edit the event" : "Create an event"}</DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-4 px-6 pb-4 pt-6">
            <DialogTitle className="sr-only">{event ? "Edit event" : "New event"}</DialogTitle>
            <input
              autoFocus={!event}
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Add title"
              aria-label="Title"
              maxLength={200}
              className="w-full bg-transparent pr-8 font-display text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
            />

            {/* When */}
            <div className="flex gap-3">
              <Clock className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-2">
                {form.allDay ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <DateButton label="First day" value={form.start} onChange={(d) => setStart(startOfDay(d))} />
                    <span className="text-sm text-muted-foreground">to</span>
                    <DateButton
                      label="Last day"
                      value={lastDay}
                      onChange={(d) => patch({ end: addDays(startOfDay(d < form.start ? form.start : d), 1) })}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <DateButton label="Start date" value={form.start} onChange={(d) => setStart(atMinutes(d, minutesOf(form.start)))} />
                      <TimeSelect label="Start time" value={minutesOf(form.start)} onChange={(m) => setStart(atMinutes(form.start, m))} />
                      <span className="text-sm text-muted-foreground">–</span>
                      <TimeSelect
                        label="End time"
                        value={minutesOf(form.end)}
                        from={isSameDay(form.start, form.end) ? minutesOf(form.start) + 15 : 0}
                        onChange={(m) => patch({ end: atMinutes(form.end, m) })}
                      />
                    </div>
                    {!isSameDay(form.start, form.end) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Ends <DateButton label="End date" value={form.end} onChange={(d) => patch({ end: atMinutes(d < form.start ? form.start : d, minutesOf(form.end)) })} />
                      </div>
                    )}
                    {duration > 0 && isSameDay(form.start, form.end) && (
                      <p className="text-xs text-muted-foreground">{duration < 60 ? `${duration} min` : `${Math.floor(duration / 60)} h${duration % 60 ? ` ${duration % 60} min` : ""}`}</p>
                    )}
                  </>
                )}
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.allDay} onChange={(e) => toggleAllDay(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                  All day
                </label>
              </div>
            </div>

            {/* Reminder */}
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
              <select
                aria-label="Reminder"
                value={form.reminderMinutes ?? "none"}
                onChange={(e) => patch({ reminderMinutes: e.target.value === "none" ? null : Number(e.target.value) })}
                className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={String(o.value)} value={o.value ?? "none"}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Where */}
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Add location"
                aria-label="Location"
                maxLength={300}
                className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {event?.meetLink && (
              <div className="flex items-center gap-3">
                <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => window.open(event.meetLink!, "_blank", "noopener")}>
                  Join meeting
                </Button>
              </div>
            )}

            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Add a description"
              aria-label="Description"
              rows={3}
              maxLength={5000}
              className="w-full resize-y rounded-lg border bg-muted/30 p-3 text-sm outline-none focus:border-primary/50 focus:bg-background"
            />

            {/* Google Calendar */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              {fromGoogle ? (
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span className="text-muted-foreground">From Google Calendar · changes sync back</span>
                  {event?.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              ) : connected ? (
                <label className="flex flex-1 cursor-pointer items-center justify-between gap-2">
                  <span>
                    Add to Google Calendar
                    <span className="block text-xs text-muted-foreground">{connection?.connected ? connection.email : ""}</span>
                  </span>
                  <input type="checkbox" checked={form.syncToGoogle} onChange={(e) => patch({ syncToGoogle: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                </label>
              ) : (
                <span className="flex flex-1 items-center justify-between gap-2 text-muted-foreground">
                  Only in Team Task
                  <a href={calendarConnectUrl(workspaceId)} className="text-primary hover:underline">
                    Connect Google Calendar
                  </a>
                </span>
              )}
            </div>
            {event?.syncError && (
              <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Not saved to Google Calendar yet: {event.syncError}. It will retry on the next sync.
              </p>
            )}
          </div>

          <div className={cn("flex items-center gap-2 border-t px-6 py-3", event ? "justify-between" : "justify-end")}>
            {event &&
              (confirmDelete ? (
                <span className="flex items-center gap-2 text-sm">
                  Delete{event.synced ? " everywhere" : ""}?
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    disabled={deleteEvent.isPending}
                    onClick={() => deleteEvent.mutate(event._id, { onSuccess: close })}
                  >
                    {deleteEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                </span>
              ) : (
                <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ))}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="h-9" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" className="h-9 min-w-20" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : event ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
