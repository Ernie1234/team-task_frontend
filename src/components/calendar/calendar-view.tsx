import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Bell, ChevronLeft, ChevronRight, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCalendarConnection, useEvents } from "@/hooks/api/use-calendar";
import { useTasks } from "@/hooks/api/use-tasks";
import useEventDialog from "@/hooks/use-event-dialog";
import { getEventQueryFn } from "@/lib/api";
import { eventOnDay, formatEventTime, layoutDay } from "@/lib/calendar";
import { projectIdOf, STATUS_META } from "@/lib/task-meta";
import type { CalendarEventType, TaskType } from "@/types/api.type";
import { CalendarConnectionControl } from "./calendar-connection";

const VIEWS = ["week", "month", "agenda"] as const;
type View = (typeof VIEWS)[number];
const HOUR = 52; // px per hour in the week grid
const WEEK = { weekStartsOn: 1 as const };
const LAYERS_KEY = "calendar:layers";

const tone = (e: CalendarEventType) =>
  e.source === "google"
    ? "bg-sky-500/15 text-sky-800 border-sky-500 dark:text-sky-200"
    : "bg-primary/15 text-foreground border-primary";

const rangeFor = (view: View, date: Date) => {
  if (view === "week") return { from: startOfWeek(date, WEEK), to: addDays(startOfWeek(date, WEEK), 7) };
  if (view === "month") return { from: startOfWeek(startOfMonth(date), WEEK), to: addDays(endOfWeek(endOfMonth(date), WEEK), 1) };
  return { from: startOfDay(date), to: addDays(startOfDay(date), 30) };
};

/** Notion-Calendar-style page: week grid, month and agenda; your events, Google events and task due dates */
export default function CalendarView({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const [state, setState] = useQueryStates({
    view: parseAsStringLiteral(VIEWS).withDefault("week"),
    date: parseAsString,
    event: parseAsString,
    calendar: parseAsString,
    reason: parseAsString,
  });
  const date = state.date ? parseISO(state.date) : new Date();
  const { from, to } = useMemo(() => rangeFor(state.view, date), [state.view, state.date]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: events = [], isFetching } = useEvents(from, to);
  const { data: connection } = useCalendarConnection();
  const { openNew, openEvent } = useEventDialog();

  const [layers, setLayers] = useState<{ google: boolean; tasks: boolean }>(() => {
    try {
      return { google: true, tasks: true, ...JSON.parse(localStorage.getItem(LAYERS_KEY) ?? "{}") };
    } catch {
      return { google: true, tasks: true };
    }
  });
  const toggleLayer = (key: keyof typeof layers) =>
    setLayers((l) => {
      const next = { ...l, [key]: !l[key] };
      localStorage.setItem(LAYERS_KEY, JSON.stringify(next));
      return next;
    });

  const { data: taskData } = useTasks({ workspaceId }, layers.tasks);
  const tasks = useMemo(
    () => (taskData?.tasks ?? []).filter((t) => t.dueDate && new Date(t.dueDate) >= from && new Date(t.dueDate) < to),
    [taskData, from, to]
  );
  const visible = useMemo(() => events.filter((e) => layers.google || e.source !== "google"), [events, layers.google]);

  // Back from Google's consent screen
  useEffect(() => {
    if (!state.calendar) return;
    if (state.calendar === "connected") toast({ title: "Google Calendar connected", description: "Your events are synced. New events can be added to Google too." });
    else toast({ title: "Couldn't connect Google Calendar", description: state.reason ?? undefined, variant: "destructive" });
    setState({ calendar: null, reason: null });
  }, [state.calendar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ?event=… (from a reminder or notification): open it
  useEffect(() => {
    if (!state.event) return;
    const id = state.event;
    setState({ event: null });
    getEventQueryFn(id).then(
      ({ event }) => {
        setState({ date: format(new Date(event.start), "yyyy-MM-dd") });
        openEvent(event);
      },
      () => toast({ title: "That event no longer exists", variant: "destructive" })
    );
  }, [state.event]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (dir: -1 | 1) => {
    const next = state.view === "month" ? addMonths(date, dir) : state.view === "week" ? addWeeks(date, dir) : addDays(date, 30 * dir);
    setState({ date: format(next, "yyyy-MM-dd") });
  };
  const openTask = (t: TaskType) => navigate(`/workspace/${workspaceId}/tasks?task=${t._id}&taskProject=${projectIdOf(t)}`);

  const title =
    state.view === "month"
      ? format(date, "MMMM yyyy")
      : state.view === "week"
        ? isSameMonth(from, addDays(to, -1))
          ? format(from, "MMMM yyyy")
          : `${format(from, "MMM")} – ${format(addDays(to, -1), "MMM yyyy")}`
        : `${format(from, "MMM d")} – ${format(addDays(to, -1), "MMM d, yyyy")}`;

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
        <h1 className="mr-2 font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setState({ date: null })}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => go(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {isFetching && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-label="Loading" />}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1 md:flex" aria-label="Show">
            <Layer on label="Team Task" dot="bg-primary" />
            {connection?.connected && <Layer on={layers.google} onClick={() => toggleLayer("google")} label="Google" dot="bg-sky-500" />}
            <Layer on={layers.tasks} onClick={() => toggleLayer("tasks")} label="Task due dates" dot="border-2 border-muted-foreground bg-transparent" />
          </div>
          <div className="flex rounded-lg border p-0.5" role="tablist" aria-label="View">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={state.view === v}
                onClick={() => setState({ view: v === "week" ? null : v })}
                className={cn(
                  "h-7 rounded-md px-3 text-sm capitalize transition-colors",
                  state.view === v ? "bg-muted font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <CalendarConnectionControl workspaceId={workspaceId} />
          <Button className="h-9 gap-1.5" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      <DesktopAlertsBanner />

      <div className="min-h-0 flex-1">
        {state.view === "week" && <WeekGrid from={from} events={visible} tasks={tasks} onOpen={openEvent} onTask={openTask} onCreate={openNew} />}
        {state.view === "month" && <MonthGrid date={date} from={from} to={to} events={visible} tasks={tasks} onOpen={openEvent} onTask={openTask} onCreate={openNew} />}
        {state.view === "agenda" && <Agenda from={from} events={visible} tasks={tasks} onOpen={openEvent} onTask={openTask} onCreate={openNew} />}
      </div>
    </div>
  );
}

function Layer({ on, onClick, label, dot }: { on: boolean; onClick?: () => void; label: string; dot: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={on}
      className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors", on ? "text-foreground" : "text-muted-foreground line-through", onClick && "hover:bg-muted")}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", dot, !on && "opacity-40")} /> {label}
    </button>
  );
}

/** Ask once for desktop notifications, so reminders reach you in another tab */
function DesktopAlertsBanner() {
  const supported = typeof Notification !== "undefined";
  const [permission, setPermission] = useState(supported ? Notification.permission : "denied");
  const [hidden, setHidden] = useState(() => localStorage.getItem("calendar:alerts-dismissed") === "1");
  if (!supported || permission !== "default" || hidden) return null;
  return (
    <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-2 text-sm sm:px-6">
      <Bell className="h-4 w-4 text-primary" />
      <span className="flex-1">Get event reminders even when Team Task is in another tab.</span>
      <Button size="sm" className="h-7" onClick={() => Notification.requestPermission().then(setPermission)}>
        Turn on desktop alerts
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7"
        onClick={() => {
          localStorage.setItem("calendar:alerts-dismissed", "1");
          setHidden(true);
        }}
      >
        Not now
      </Button>
    </div>
  );
}

type GridProps = {
  events: CalendarEventType[];
  tasks: TaskType[];
  onOpen: (e: CalendarEventType) => void;
  onTask: (t: TaskType) => void;
  onCreate: (draft?: { start?: string; end?: string; allDay?: boolean }) => void;
};

function TaskChip({ task, onClick }: { task: TaskType; onClick: () => void }) {
  const done = task.status === "DONE";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-1.5 truncate rounded border border-dashed border-muted-foreground/40 bg-background px-1.5 py-0.5 text-left text-xs hover:bg-muted"
      title={`Task due: ${task.title}`}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_META[task.status].dot)} />
      <span className={cn("truncate", done && "text-muted-foreground line-through")}>{task.title}</span>
    </button>
  );
}

function AllDayChip({ event, onOpen }: { event: CalendarEventType; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn("w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-xs font-medium", tone(event))}
    >
      {event.title}
    </button>
  );
}

/* ----------------------------------------------------------------- week */

function WeekGrid({ from, events, tasks, onOpen, onTask, onCreate }: GridProps & { from: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  // Start the view around the working day
  useEffect(() => {
    scroller.current?.scrollTo({ top: Math.max(0, (Math.min(now.getHours(), 17) - 1.5) * HOUR) });
  }, [from.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const allDay = events.filter((e) => e.allDay || new Date(e.end).getTime() - new Date(e.start).getTime() >= 86_400_000);
  const timed = events.filter((e) => !allDay.includes(e));

  const createAt = (day: Date, y: number) => {
    const minutes = Math.max(0, Math.min(23.5 * 60, Math.floor(y / HOUR / 0.5) * 30));
    const start = new Date(startOfDay(day).getTime() + minutes * 60_000);
    onCreate({ start: start.toISOString(), end: new Date(start.getTime() + 60 * 60_000).toISOString() });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Day headers + all-day lane */}
      <div className="grid shrink-0 grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b pr-[var(--scrollbar,0px)]">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-l px-2 py-2 text-center">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{format(day, "EEE")}</div>
            <div
              className={cn(
                "mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
        <div className="flex items-start justify-end pr-2 pt-1 text-[10px] text-muted-foreground">all-day</div>
        {days.map((day) => {
          const dayEvents = allDay.filter((e) => eventOnDay(e, day));
          const dayTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate!), day));
          return (
            <div
              key={`ad-${day.toISOString()}`}
              className="min-h-7 space-y-0.5 border-l p-1"
              onDoubleClick={() => onCreate({ start: startOfDay(day).toISOString(), end: addDays(startOfDay(day), 1).toISOString(), allDay: true })}
            >
              {dayEvents.map((e) => (
                <AllDayChip key={e._id} event={e} onOpen={() => onOpen(e)} />
              ))}
              {dayTasks.map((t) => (
                <TaskChip key={t._id} task={t} onClick={() => onTask(t)} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Hours */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: HOUR * 24 }}>
          <div className="relative">
            {Array.from({ length: 23 }, (_, h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: (h + 1) * HOUR }}>
                {format(new Date(2026, 0, 1, h + 1), "h a")}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const placed = layoutDay(timed.filter((e) => eventOnDay(e, day)), day, HOUR);
            return (
              <div
                key={day.toISOString()}
                className="relative cursor-cell border-l"
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR - 1}px, hsl(var(--border)) ${HOUR - 1}px ${HOUR}px)` }}
                onClick={(e) => createAt(day, e.clientY - e.currentTarget.getBoundingClientRect().top)}
              >
                {placed.map(({ event, top, height, column, columns }) => (
                  <button
                    key={event._id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(event);
                    }}
                    className={cn("absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs shadow-sm transition-shadow hover:z-10 hover:shadow-md", tone(event))}
                    style={{ top: top + 1, height: height - 2, left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}
                  >
                    <span className="flex items-center gap-1 font-semibold leading-tight">
                      <span className="truncate">{event.title}</span>
                      {event.meetLink && <Video className="h-3 w-3 shrink-0 opacity-70" />}
                    </span>
                    {height > 34 && <span className="block truncate opacity-75">{formatEventTime(event)}</span>}
                    {height > 52 && event.location && <span className="block truncate opacity-75">{event.location}</span>}
                  </button>
                ))}
                {isToday(day) && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }}>
                    <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-0.5 flex-1 bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- month */

function MonthGrid({ date, from, to, events, tasks, onOpen, onTask, onCreate }: GridProps & { date: Date; from: Date; to: Date }) {
  const days = Array.from({ length: differenceInCalendarDays(to, from) }, (_, i) => addDays(from, i));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {format(d, "EEE")}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7" style={{ gridAutoRows: "minmax(96px, 1fr)" }}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => eventOnDay(e, day));
          const dayTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate!), day));
          const items = [
            ...dayEvents.map((e) => ({ key: e._id, node: <MonthItem key={e._id} event={e} onOpen={() => onOpen(e)} /> })),
            ...dayTasks.map((t) => ({ key: t._id, node: <TaskChip key={t._id} task={t} onClick={() => onTask(t)} /> })),
          ];
          const shown = items.slice(0, 3);
          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                const start = new Date(startOfDay(day).getTime() + 9 * 3600_000);
                onCreate({ start: start.toISOString(), end: new Date(start.getTime() + 3600_000).toISOString() });
              }}
              className={cn("min-w-0 cursor-cell space-y-0.5 border-b border-r p-1", !isSameMonth(day, date) && "bg-muted/30")}
            >
              <div
                className={cn(
                  "mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday(day) ? "bg-primary font-semibold text-primary-foreground" : !isSameMonth(day, date) && "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </div>
              {shown.map((i) => i.node)}
              {items.length > 3 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" onClick={(e) => e.stopPropagation()} className="px-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                      +{items.length - 3} more
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
                    <p className="px-1 pb-1 text-sm font-semibold">{format(day, "EEEE, MMM d")}</p>
                    {items.map((i) => i.node)}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthItem({ event, onOpen }: { event: CalendarEventType; onOpen: () => void }) {
  if (event.allDay) return <AllDayChip event={event} onOpen={onOpen} />;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", event.source === "google" ? "bg-sky-500" : "bg-primary")} />
      <span className="shrink-0 text-muted-foreground">{format(new Date(event.start), "h:mma").toLowerCase()}</span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

/* ----------------------------------------------------------------- agenda */

function Agenda({ from, events, tasks, onOpen, onTask, onCreate }: GridProps & { from: Date }) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(from, i))
    .map((day) => ({
      day,
      events: events.filter((e) => eventOnDay(e, day)),
      tasks: tasks.filter((t) => isSameDay(new Date(t.dueDate!), day)),
    }))
    .filter((d) => d.events.length || d.tasks.length);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {days.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">Nothing scheduled in the next 30 days</p>
            <Button className="mt-4 gap-1.5" onClick={() => onCreate()}>
              <Plus className="h-4 w-4" /> New event
            </Button>
          </div>
        )}
        {days.map(({ day, events: dayEvents, tasks: dayTasks }) => (
          <section key={day.toISOString()} className="mb-6">
            <h2 className={cn("mb-2 text-sm font-semibold", isToday(day) && "text-primary")}>
              {isToday(day) ? "Today · " : ""}
              {format(day, "EEEE, MMMM d")}
            </h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {dayEvents.map((e) => (
                <li key={e._id}>
                  <button type="button" onClick={() => onOpen(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                    <span className={cn("h-9 w-1 shrink-0 rounded-full", e.source === "google" ? "bg-sky-500" : "bg-primary")} />
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">{formatEventTime(e)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.title}</span>
                      {e.location && <span className="block truncate text-xs text-muted-foreground">{e.location}</span>}
                    </span>
                    {e.meetLink && <Video className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    {e.reminderMinutes !== null && <Bell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              ))}
              {dayTasks.map((t) => (
                <li key={t._id} className="px-3 py-2">
                  <TaskChip task={t} onClick={() => onTask(t)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
