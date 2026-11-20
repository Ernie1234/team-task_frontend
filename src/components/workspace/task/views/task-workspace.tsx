import { useEffect, useMemo, useState } from "react";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, CalendarClock, KanbanSquare, List, Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useAuth from "@/hooks/api/use-auth";
import { useTasks, type TaskQuery } from "@/hooks/api/use-tasks";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import useGetProjectsInWorkspaceQuery from "@/hooks/api/use-get-projects";
import { DataTableFacetedFilter } from "../table/table-faceted-filter";
import { priorities, statuses } from "../table/data";
import { isOverdue, projectIdOf } from "@/lib/task-meta";
import CreateTaskDialog from "../create-task-dialog";
import TaskListView from "./task-list-view";
import TaskBoardView from "./task-board-view";
import TaskDetailDialog, { type TaskRef } from "./task-detail-dialog";
import { AssigneeAvatar } from "./task-pickers";
import type { TaskType } from "@/types/api.type";

const SORTS = {
  newest: { label: "Newest first", sortBy: "createdAt", sortOrder: "desc" },
  due: { label: "Due date", sortBy: "dueDate", sortOrder: "asc" },
  priority: { label: "Priority", sortBy: "priority", sortOrder: "desc" },
  name: { label: "Name", sortBy: "title", sortOrder: "asc" },
} as const;
type SortKey = keyof typeof SORTS;

// Everything about the view lives in the URL, so it survives reloads and can be shared
const useTaskViewState = () =>
  useQueryStates({
    view: parseAsStringEnum(["list", "board"]).withDefault("list"),
    q: parseAsString,
    status: parseAsString,
    priority: parseAsString,
    assignee: parseAsString,
    project: parseAsString,
    quick: parseAsStringEnum(["mine", "overdue", "week", "today"]),
    sort: parseAsStringEnum(Object.keys(SORTS) as SortKey[]).withDefault("newest"),
    task: parseAsString,
    taskProject: parseAsString,
  });

const QuickFilter = ({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UserRound;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-transparent bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-sm"
        : "bg-background text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    {children}
  </button>
);

/**
 * The ClickUp-style task experience: List (grouped by status, with subtasks)
 * and Board (drag between columns), shared filters, and a task window.
 * Used by the Tasks page (whole workspace) and project pages (one project).
 */
const TaskWorkspace = ({ workspaceId, projectId, title, subtitle }: { workspaceId: string; projectId?: string; title?: string; subtitle?: string }) => {
  const [state, setState] = useTaskViewState();
  const { data: auth } = useAuth();
  const myId = auth?.user?._id;

  // Debounce typing in the search box
  const [search, setSearch] = useState(state.q ?? "");
  useEffect(() => setSearch(state.q ?? ""), [state.q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if ((search || null) !== (state.q || null)) setState({ q: search || null });
    }, 250);
    return () => clearTimeout(id);
  }, [search, state.q, setState]);

  const sort = SORTS[state.sort as SortKey] ?? SORTS.newest;
  const query: TaskQuery = {
    workspaceId,
    projectId: projectId || state.project || undefined,
    keyword: state.q || undefined,
    status: (state.status as TaskQuery["status"]) || undefined,
    priority: (state.priority as TaskQuery["priority"]) || undefined,
    assignedTo: state.quick === "mine" ? myId : state.assignee || undefined,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  };
  const { data, isLoading, isFetching } = useTasks(query);

  const tasks = useMemo(() => {
    const all = data?.tasks ?? [];
    if (state.quick === "overdue") return all.filter((t) => isOverdue(t.dueDate, t.status));
    if (state.quick === "today")
      return all.filter(
        (t) => !!t.dueDate && t.status !== "DONE" && differenceInCalendarDays(new Date(t.dueDate), new Date()) === 0
      );
    if (state.quick === "week")
      return all.filter((t) => {
        if (!t.dueDate || t.status === "DONE") return false;
        const days = differenceInCalendarDays(new Date(t.dueDate), new Date());
        return days >= 0 && days <= 7;
      });
    return all;
  }, [data, state.quick]);

  const counts = useMemo(() => {
    const all = data?.tasks ?? [];
    return {
      open: all.filter((t) => t.status !== "DONE").length,
      overdue: all.filter((t) => isOverdue(t.dueDate, t.status)).length,
      done: all.filter((t) => t.status === "DONE").length,
    };
  }, [data]);

  const { data: memberData } = useGetWorkspaceMembers(workspaceId);
  const { data: projectData } = useGetProjectsInWorkspaceQuery({ workspaceId, skip: !!projectId });
  const assigneeOptions = (memberData?.members ?? [])
    .filter((m) => m.userId)
    .map((m) => ({
      value: m.userId._id,
      label: (
        <span className="flex items-center gap-2">
          <AssigneeAvatar user={m.userId} />
          {m.userId.name}
        </span>
      ),
    }));
  const projectOptions = (projectData?.projects ?? []).map((p) => ({
    value: p._id,
    label: (
      <span className="flex items-center gap-1.5">
        {p.emoji} {p.name}
      </span>
    ),
  }));

  const openTask = (task: TaskType) => setState({ task: task._id, taskProject: projectIdOf(task) });
  const openRef = (ref: TaskRef) => setState({ task: ref.taskId, taskProject: ref.projectId });
  const closeTask = () => setState({ task: null, taskProject: null });
  const taskRef = state.task && state.taskProject ? { taskId: state.task, projectId: state.taskProject } : null;

  const hasFilters = !!(state.q || state.status || state.priority || state.assignee || state.project || state.quick);
  const setMulti = (key: "status" | "priority" | "assignee" | "project", values: string[]) =>
    setState({ [key]: values.length ? values.join(",") : null });

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {projectId ? (
            <h2 className="font-display text-lg font-semibold tracking-tight">{title ?? "Tasks"}</h2>
          ) : (
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[28px] sm:leading-9">{title ?? "Tasks"}</h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle ?? (
              <>
                {counts.open} open
                {counts.overdue > 0 && <span className="text-red-500"> · {counts.overdue} overdue</span>}
                {" · "}
                {counts.done} done
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5" role="tablist" aria-label="View">
            {(
              [
                ["list", "List", List],
                ["board", "Board", KanbanSquare],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={state.view === id}
                onClick={() => setState({ view: id })}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                  state.view === id ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <CreateTaskDialog projectId={projectId} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or IDs"
            className="h-8 pl-8"
            aria-label="Search tasks"
          />
        </div>
        <QuickFilter active={state.quick === "mine"} onClick={() => setState({ quick: state.quick === "mine" ? null : "mine" })} icon={UserRound}>
          Assigned to me
        </QuickFilter>
        <QuickFilter active={state.quick === "overdue"} onClick={() => setState({ quick: state.quick === "overdue" ? null : "overdue" })} icon={AlertTriangle}>
          Overdue
        </QuickFilter>
        <QuickFilter active={state.quick === "week"} onClick={() => setState({ quick: state.quick === "week" ? null : "week" })} icon={CalendarClock}>
          Due this week
        </QuickFilter>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <DataTableFacetedFilter
          title="Status"
          multiSelect
          options={statuses}
          selectedValues={state.status?.split(",") ?? []}
          onFilterChange={(values) => setMulti("status", values)}
        />
        <DataTableFacetedFilter
          title="Priority"
          multiSelect
          options={priorities}
          selectedValues={state.priority?.split(",") ?? []}
          onFilterChange={(values) => setMulti("priority", values)}
        />
        {state.quick !== "mine" && (
          <DataTableFacetedFilter
            title="Assignee"
            multiSelect
            options={assigneeOptions}
            selectedValues={state.assignee?.split(",") ?? []}
            onFilterChange={(values) => setMulti("assignee", values)}
          />
        )}
        {!projectId && (
          <DataTableFacetedFilter
            title="Project"
            multiSelect={false}
            options={projectOptions}
            selectedValues={state.project ? [state.project] : []}
            onFilterChange={(values) => setMulti("project", values)}
          />
        )}
        {state.quick === "today" && (
          <QuickFilter active onClick={() => setState({ quick: null })} icon={CalendarClock}>
            Due today
          </QuickFilter>
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              setSearch("");
              setState({ q: null, status: null, priority: null, assignee: null, project: null, quick: null });
            }}
          >
            Clear <X className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}

        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Sort
          <select
            value={state.sort}
            onChange={(e) => setState({ sort: e.target.value as SortKey })}
            className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {isFetching && !isLoading && <span className="text-xs text-muted-foreground" role="status">Updating…</span>}
      </div>

      {/* Views */}
      {!isLoading && tasks.length === 0 && hasFilters ? (
        <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
          No tasks match these filters.{" "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setSearch("");
              setState({ q: null, status: null, priority: null, assignee: null, project: null, quick: null });
            }}
          >
            Clear filters
          </button>
        </div>
      ) : state.view === "board" ? (
        <TaskBoardView workspaceId={workspaceId} projectId={projectId} tasks={tasks} isLoading={isLoading} onOpen={openTask} />
      ) : (
        <TaskListView workspaceId={workspaceId} projectId={projectId} tasks={tasks} isLoading={isLoading} onOpen={openTask} />
      )}

      <TaskDetailDialog workspaceId={workspaceId} taskRef={taskRef} onOpenTask={openRef} onClose={closeTask} />
    </div>
  );
};

export default TaskWorkspace;
