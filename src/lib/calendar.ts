import { addDays, differenceInMinutes, endOfDay, format, isSameDay, startOfDay } from "date-fns";
import type { CalendarEventType } from "@/types/api.type";

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "No reminder" },
  { value: 0, label: "At start time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

export const reminderLabel = (minutes: number | null) =>
  REMINDER_OPTIONS.find((o) => o.value === minutes)?.label ?? (minutes === null ? "No reminder" : `${minutes} minutes before`);

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** Does the event touch this day? (end is exclusive) */
export const eventOnDay = (e: Pick<CalendarEventType, "start" | "end">, day: Date) => {
  const start = new Date(e.start);
  const end = new Date(e.end);
  return start < endOfDay(day) && end > startOfDay(day);
};

export const formatEventTime = (e: Pick<CalendarEventType, "start" | "end" | "allDay">) => {
  const start = new Date(e.start);
  const end = new Date(e.end);
  if (e.allDay) {
    const last = addDays(end, -1);
    return isSameDay(start, last) ? "All day" : `${format(start, "MMM d")} – ${format(last, "MMM d")}`;
  }
  const sameDay = isSameDay(start, end);
  const t = (d: Date) => format(d, d.getMinutes() ? "h:mm a" : "h a");
  return sameDay ? `${t(start)} – ${t(end)}` : `${format(start, "MMM d, h:mm a")} – ${format(end, "MMM d, h:mm a")}`;
};

/** "in 12 min", "Tomorrow 9 AM"... for upcoming lists */
export const relativeStart = (e: Pick<CalendarEventType, "start" | "end" | "allDay">, now = new Date()) => {
  const start = new Date(e.start);
  if (e.allDay) return isSameDay(start, now) ? "Today" : isSameDay(start, addDays(now, 1)) ? "Tomorrow" : format(start, "EEE, MMM d");
  if (start <= now && new Date(e.end) > now) return "Now";
  const minutes = differenceInMinutes(start, now);
  if (minutes < 60) return `in ${Math.max(1, minutes)} min`;
  const time = format(start, start.getMinutes() ? "h:mm a" : "h a");
  if (isSameDay(start, now)) return `Today ${time}`;
  if (isSameDay(start, addDays(now, 1))) return `Tomorrow ${time}`;
  return format(start, "EEE ") + time;
};

export type PlacedEvent = { event: CalendarEventType; top: number; height: number; column: number; columns: number };

/**
 * Lay out one day's timed events in the week grid: overlapping events share
 * the width side by side (like Google/Notion Calendar).
 */
export const layoutDay = (events: CalendarEventType[], day: Date, hourHeight: number): PlacedEvent[] => {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  const items = events
    .map((event) => {
      const s = Math.max(new Date(event.start).getTime(), dayStart);
      const e = Math.min(new Date(event.end).getTime(), dayEnd);
      return { event, s, e: Math.max(e, s + 15 * 60_000) };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);

  const placed: PlacedEvent[] = [];
  let cluster: (typeof items[number] & { column: number })[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const columns = Math.max(1, ...cluster.map((c) => c.column + 1));
    cluster.forEach((c) =>
      placed.push({
        event: c.event,
        top: ((c.s - dayStart) / 3_600_000) * hourHeight,
        height: Math.max(((c.e - c.s) / 3_600_000) * hourHeight, 20),
        column: c.column,
        columns,
      })
    );
    cluster = [];
  };
  for (const item of items) {
    if (item.s >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.e > item.s).map((c) => c.column));
    let column = 0;
    while (used.has(column)) column++;
    cluster.push({ ...item, column });
    clusterEnd = Math.max(clusterEnd, item.e);
  }
  if (cluster.length) flush();
  return placed;
};
