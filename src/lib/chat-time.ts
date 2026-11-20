import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";

// Conversation list: "10:42", "Yesterday", "Mon", "Sep 6", "Sep 6, 2025"
export const formatListTime = (value: string | Date) => {
  const date = new Date(value);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), date) < 7) return format(date, "EEE");
  if (date.getFullYear() === new Date().getFullYear()) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
};

// Divider between days in a thread
export const formatDayLabel = (value: string | Date) => {
  const date = new Date(value);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (date.getFullYear() === new Date().getFullYear()) return format(date, "EEEE, MMMM d");
  return format(date, "EEEE, MMMM d, yyyy");
};

export const formatMessageTime = (value: string | Date) => format(new Date(value), "HH:mm");

export const formatFullTime = (value: string | Date) =>
  format(new Date(value), "EEEE, MMMM d, yyyy 'at' HH:mm");

export const sameDay = (a: string | Date, b: string | Date) =>
  differenceInCalendarDays(new Date(a), new Date(b)) === 0;
