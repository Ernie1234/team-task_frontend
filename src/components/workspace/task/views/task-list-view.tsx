import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch, MoreHorizontal, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_META, STATUS_ORDER, projectIdOf } from "@/lib/task-meta";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/api/use-tasks";
import type { TaskStatusEnumType } from "@/constant";
import type { TaskType } from "@/types/api.type";
import {
  AssigneeAvatar,
  AssigneePicker,
  DueLabel,
  DuePicker,
  IconCell,
  PriorityFlag,
  PriorityPicker,
  StatusDot,
  StatusPicker,
} from "./task-pickers";
import QuickAddTask from "./quick-add-task";
import { ConfirmDialog } from "@/components/resuable/confirm-dialog";

type ListProps = {
  workspaceId: string;
  projectId?: string;
  tasks: TaskType[];
  isLoading?: boolean;
  onOpen: (task: TaskType) => void;
  hiddenStatuses?: TaskStatusEnumType[];
};

const gridCols = (showProject: boolean) =>
  showProject
    ? "md:grid-cols-[minmax(0,1fr)_96px_96px_80px_150px_36px]"
    : "md:grid-cols-[minmax(0,1fr)_96px_96px_80px_36px]";

const SubtaskProgress = ({ task }: { task: TaskType }) =>
  task.subtaskCount ? (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
      title={`${task.subtaskDoneCount} of ${task.subtaskCount} subtasks done`}
    >
      <GitBranch className="h-3 w-3" />
      {task.subtaskDoneCount}/{task.subtaskCount}
    </span>
  ) : null;

const TaskRow = ({
  task,
  workspaceId,
  showProject,
  depth = 0,
  onOpen,
}: {
  task: TaskType;
  workspaceId: string;
  showProject: boolean;
  depth?: number;
  onOpen: (task: TaskType) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateTask(workspaceId);
  const remove = useDeleteTask(workspaceId);
  const hasSubtasks = (task.subtaskCount ?? 0) > 0;
  const done = task.status === "DONE";

  const { data: subtaskData, isLoading: loadingSubtasks } = useTasks(
    { workspaceId, parentTask: task._id, sortBy: "createdAt", sortOrder: "asc" },
    expanded
  );

  return (
    <>
      <div
        role="row"
        tabIndex={0}
        onClick={() => onOpen(task)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
        className={cn(
          "group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none",
          gridCols(showProject)
        )}
      >
        {/* Name */}
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: depth * 28 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted",
              !hasSubtasks && "invisible"
            )}
            aria-label={expanded ? "Hide subtasks" : "Show subtasks"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <StatusPicker value={task.status} onChange={(status) => update.mutate({ task, data: { status } })}>
            <button type="button" className="shrink-0 rounded-full p-0.5 hover:bg-muted" aria-label={`Status: ${STATUS_META[task.status].label}`}>
              <StatusDot status={task.status} />
            </button>
          </StatusPicker>
          <span className={cn("truncate", done && "text-muted-foreground line-through decoration-muted-foreground/50")}>
            {task.title}
          </span>
          <SubtaskProgress task={task} />
          <span className="hidden shrink-0 text-[11px] text-muted-foreground/70 lg:inline">{task.taskCode}</span>
        </div>

        {/* Assignee */}
        <div className="hidden md:block">
          <AssigneePicker
            workspaceId={workspaceId}
            value={task.assignedTo?._id}
            onChange={(user) =>
              update.mutate({
                task,
                data: { assignedTo: user?._id ?? null },
                optimistic: { assignedTo: user ? { ...user, profilePicture: user.profilePicture ?? null } : null },
              })
            }
          >
            <IconCell aria-label="Assignee">
              <AssigneeAvatar user={task.assignedTo} />
            </IconCell>
          </AssigneePicker>
        </div>

        {/* Due date */}
        <div className="flex justify-end md:block">
          <DuePicker value={task.dueDate} onChange={(dueDate) => update.mutate({ task, data: { dueDate } })}>
            <IconCell aria-label="Due date">
              <DueLabel dueDate={task.dueDate} status={task.status} />
            </IconCell>
          </DuePicker>
        </div>

        {/* Priority */}
        <div className="hidden md:block">
          <PriorityPicker value={task.priority} onChange={(priority) => update.mutate({ task, data: { priority } })}>
            <IconCell aria-label="Priority">
              <PriorityFlag priority={task.priority} showLabel />
            </IconCell>
          </PriorityPicker>
        </div>

        {/* Project */}
        {showProject && (
          <div className="hidden min-w-0 truncate text-xs text-muted-foreground md:block">
            {task.project ? `${task.project.emoji} ${task.project.name}` : ""}
          </div>
        )}

        {/* Actions */}
        <div className="hidden justify-end md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <IconCell className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="Task actions">
                <MoreHorizontal className="h-4 w-4" />
              </IconCell>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onOpen(task)}>
                <ExternalLink className="mr-2 h-4 w-4" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        isLoading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(
            { taskId: task._id, projectId: projectIdOf(task) },
            { onSettled: () => setConfirmDelete(false) }
          )
        }
        title={`Delete “${task.title}”?`}
        description={hasSubtasks ? "Its subtasks will be deleted too. This can't be undone." : "This can't be undone."}
        confirmText="Delete task"
        cancelText="Keep it"
      />

      {expanded && (
        <>
          {loadingSubtasks && (
            <div className="border-b px-2 py-2 text-xs text-muted-foreground" style={{ paddingLeft: (depth + 1) * 28 + 32 }}>
              Loading subtasks…
            </div>
          )}
          {subtaskData?.tasks.map((subtask) => (
            <TaskRow
              key={subtask._id}
              task={subtask}
              workspaceId={workspaceId}
              showProject={showProject}
              depth={depth + 1}
              onOpen={onOpen}
            />
          ))}
          <div className="border-b py-1" style={{ paddingLeft: (depth + 1) * 28 + 8 }}>
            <QuickAddTask
              workspaceId={workspaceId}
              projectId={projectIdOf(task)}
              parentTask={task._id}
              label="Add subtask"
              placeholder="Subtask name"
              compact
            />
          </div>
        </>
      )}
    </>
  );
};

const StatusGroup = ({
  status,
  tasks,
  workspaceId,
  projectId,
  showProject,
  onOpen,
}: {
  status: TaskStatusEnumType;
  tasks: TaskType[];
  workspaceId: string;
  projectId?: string;
  showProject: boolean;
  onOpen: (task: TaskType) => void;
}) => {
  // Done starts collapsed so open work is what you see first
  const [open, setOpen] = useState(status !== "DONE");
  const meta = STATUS_META[status];

  return (
    <section className="mb-5" aria-label={`${meta.label}, ${tasks.length} tasks`}>
      <div className="sticky top-0 z-[1] flex items-center gap-2 bg-background/95 py-1.5 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md py-0.5 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide", meta.soft, meta.text)}>
            <StatusDot status={status} className="h-3 w-3" />
            {meta.label}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
        </button>
      </div>

      {open && (
        <div className="rounded-lg border">
          {tasks.length > 0 && (
            <div
              className={cn(
                "hidden border-b px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid",
                gridCols(showProject)
              )}
              role="row"
            >
              <span className="pl-7">Name</span>
              <span>Assignee</span>
              <span>Due</span>
              <span>Priority</span>
              {showProject && <span>Project</span>}
              <span />
            </div>
          )}
          {tasks.map((task) => (
            <TaskRow key={task._id} task={task} workspaceId={workspaceId} showProject={showProject} onOpen={onOpen} />
          ))}
          <div className="px-1 py-1">
            <QuickAddTask workspaceId={workspaceId} projectId={projectId} status={status} compact />
          </div>
        </div>
      )}
    </section>
  );
};

/** ClickUp-style list: one collapsible group per status, subtasks expandable inline. */
const TaskListView = ({ workspaceId, projectId, tasks, isLoading, onOpen, hiddenStatuses = [] }: ListProps) => {
  const showProject = !projectId;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    );
  }

  return (
    <div role="table" aria-label="Tasks">
      {STATUS_ORDER.filter((s) => !hiddenStatuses.includes(s)).map((status) => (
        <StatusGroup
          key={status}
          status={status}
          tasks={tasks.filter((t) => t.status === status)}
          workspaceId={workspaceId}
          projectId={projectId}
          showProject={showProject}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
};

export default TaskListView;
