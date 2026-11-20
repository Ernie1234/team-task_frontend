import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from "date-fns";
import type { TaskPriorityEnumType, TaskStatusEnumType } from "@/constant";

// One place for how statuses and priorities look across list, board and detail
export const STATUS_ORDER: TaskStatusEnumType[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export const STATUS_META: Record<
  TaskStatusEnumType,
  { label: string; dot: string; text: string; soft: string; ring: string; border: string }
> = {
  BACKLOG: { label: "Backlog", dot: "bg-zinc-400", text: "text-zinc-500", soft: "bg-zinc-500/10", ring: "ring-zinc-400", border: "border-t-zinc-400" },
  TODO: { label: "To do", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", soft: "bg-sky-500/10", ring: "ring-sky-500", border: "border-t-sky-500" },
  IN_PROGRESS: { label: "In progress", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", soft: "bg-amber-500/10", ring: "ring-amber-500", border: "border-t-amber-500" },
  IN_REVIEW: { label: "In review", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", soft: "bg-violet-500/10", ring: "ring-violet-500", border: "border-t-violet-500" },
  DONE: { label: "Done", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", soft: "bg-emerald-500/10", ring: "ring-emerald-500", border: "border-t-emerald-500" },
};

export const PRIORITY_ORDER: TaskPriorityEnumType[] = ["HIGH", "MEDIUM", "LOW"];

export const PRIORITY_META: Record<TaskPriorityEnumType, { label: string; flag: string }> = {
  HIGH: { label: "High", flag: "text-red-500" },
  MEDIUM: { label: "Medium", flag: "text-amber-500" },
  LOW: { label: "Low", flag: "text-sky-500" },
};

export const isOverdue = (dueDate?: string | null, status?: TaskStatusEnumType) =>
  !!dueDate && status !== "DONE" && differenceInCalendarDays(new Date(dueDate), new Date()) < 0;

// "Today", "Tomorrow", "Yesterday", "Mon", "Nov 24", "Nov 24, 2027"
export const formatDue = (dueDate?: string | null) => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  const days = differenceInCalendarDays(date, new Date());
  if (days > 0 && days < 7) return format(date, "EEE");
  return date.getFullYear() === new Date().getFullYear() ? format(date, "MMM d") : format(date, "MMM d, yyyy");
};

export const projectIdOf = (task: { project?: { _id: string } | string | null }) =>
  typeof task.project === "string" ? task.project : task.project?._id ?? "";

export const parentIdOf = (task: { parentTask?: string | { _id: string } | null }) =>
  !task.parentTask ? null : typeof task.parentTask === "string" ? task.parentTask : task.parentTask._id;
