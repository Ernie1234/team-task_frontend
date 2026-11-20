import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Check, ChevronRight, Copy, GitBranch, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import TaskDescription from "./task-description";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/resuable/confirm-dialog";
import { cn } from "@/lib/utils";
import { useDeleteTask, useTask, useUpdateTask } from "@/hooks/api/use-tasks";
import { STATUS_META, projectIdOf } from "@/lib/task-meta";
import { toast } from "@/hooks/use-toast";
import type { TaskType } from "@/types/api.type";
import {
  AssigneeAvatar,
  AssigneePicker,
  DueLabel,
  DuePicker,
  IconCell,
  PriorityFlag,
  PriorityPicker,
  StatusBadge,
  StatusDot,
  StatusPicker,
} from "./task-pickers";
import QuickAddTask from "./quick-add-task";

export type TaskRef = { taskId: string; projectId: string };

const Property = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[110px_1fr] items-center gap-2 py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="min-w-0">{children}</div>
  </div>
);

// The title saves when you leave the field (or press Enter)
const useAutosave = (initial: string, save: (value: string) => void) => {
  const [value, setValue] = useState(initial);
  const last = useRef(initial);
  useEffect(() => {
    setValue(initial);
    last.current = initial;
  }, [initial]);
  const commit = () => {
    if (value !== last.current) {
      last.current = value;
      save(value);
    }
  };
  return { value, setValue, commit };
};

const SubtaskRow = ({
  subtask,
  workspaceId,
  onOpen,
}: {
  subtask: TaskType;
  workspaceId: string;
  onOpen: () => void;
}) => {
  const update = useUpdateTask(workspaceId);
  const done = subtask.status === "DONE";
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      <button
        type="button"
        onClick={() => update.mutate({ task: subtask, data: { status: done ? "TODO" : "DONE" } })}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 hover:border-emerald-500"
        )}
        aria-label={done ? `Mark "${subtask.title}" not done` : `Mark "${subtask.title}" done`}
        aria-pressed={done}
      >
        {done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className={cn("min-w-0 flex-1 truncate text-left text-sm hover:underline", done && "text-muted-foreground line-through")}
      >
        {subtask.title}
      </button>
      <StatusPicker value={subtask.status} onChange={(status) => update.mutate({ task: subtask, data: { status } })} align="end">
        <IconCell className="hidden sm:inline-flex" aria-label="Status">
          <StatusDot status={subtask.status} className="h-3.5 w-3.5" />
        </IconCell>
      </StatusPicker>
      <DuePicker value={subtask.dueDate} onChange={(dueDate) => update.mutate({ task: subtask, data: { dueDate } })}>
        <IconCell aria-label="Due date">
          <DueLabel dueDate={subtask.dueDate} status={subtask.status} />
        </IconCell>
      </DuePicker>
      <AssigneePicker
        workspaceId={workspaceId}
        value={subtask.assignedTo?._id}
        onChange={(user) =>
          update.mutate({
            task: subtask,
            data: { assignedTo: user?._id ?? null },
            optimistic: { assignedTo: user ? { ...user, profilePicture: user.profilePicture ?? null } : null },
          })
        }
      >
        <IconCell aria-label="Assignee">
          <AssigneeAvatar user={subtask.assignedTo} />
        </IconCell>
      </AssigneePicker>
    </div>
  );
};

const TaskDetailBody = ({
  workspaceId,
  taskRef,
  onOpenTask,
  onClose,
}: {
  workspaceId: string;
  taskRef: TaskRef;
  onOpenTask: (ref: TaskRef) => void;
  onClose: () => void;
}) => {
  const { data, isLoading, isError, refetch } = useTask({ workspaceId, ...taskRef });
  const update = useUpdateTask(workspaceId);
  const remove = useDeleteTask(workspaceId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const task = data?.task;
  const subtasks = data?.subtasks ?? [];
  const save = (patch: Parameters<typeof update.mutate>[0]["data"], optimistic?: Partial<TaskType>) =>
    task && update.mutate({ task: { _id: task._id, project: projectIdOf(task) }, data: patch, optimistic });

  const title = useAutosave(task?.title ?? "", (value) => {
    if (value.trim()) save({ title: value.trim() });
    else title.setValue(task?.title ?? "");
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-sm text-muted-foreground">
        <p>This task couldn't be loaded. It may have been deleted.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const parent = typeof task.parentTask === "object" ? task.parentTask : null;
  const createdBy = typeof task.createdBy === "object" ? task.createdBy : null;
  const doneCount = subtasks.filter((s) => s.status === "DONE").length;
  const progress = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0;
  const isDone = task.status === "DONE";

  return (
    <>
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1.5 border-b px-5 py-3 pr-12 text-xs text-muted-foreground">
        {task.project && (
          <span className="truncate">
            {task.project.emoji} {task.project.name}
          </span>
        )}
        {parent && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <button
              type="button"
              onClick={() => onOpenTask({ taskId: parent._id, projectId: projectIdOf(task) })}
              className="truncate hover:text-foreground hover:underline"
            >
              {parent.title}
            </button>
          </>
        )}
        <ChevronRight className="h-3 w-3 shrink-0" />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(task.taskCode);
            toast({ title: `Copied ${task.taskCode}` });
          }}
          className="flex items-center gap-1 font-mono hover:text-foreground"
          title="Copy task ID"
        >
          {task.taskCode} <Copy className="h-3 w-3" />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_260px]">
        {/* Main */}
        <div className="space-y-6 px-5 py-5 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPicker value={task.status} onChange={(status) => save({ status })}>
              <button type="button" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <StatusBadge status={task.status} />
              </button>
            </StatusPicker>
            <Button
              variant={isDone ? "secondary" : "outline"}
              size="sm"
              className={cn("h-7 gap-1.5 text-xs", isDone && "text-emerald-600 dark:text-emerald-400")}
              onClick={() => save({ status: isDone ? "TODO" : "DONE" })}
            >
              <Check className="h-3.5 w-3.5" /> {isDone ? "Completed" : "Mark complete"}
            </Button>
          </div>

          <textarea
            value={title.value}
            onChange={(e) => title.setValue(e.target.value)}
            onBlur={title.commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            rows={1}
            aria-label="Task name"
            className="w-full resize-none bg-transparent text-2xl font-bold leading-tight tracking-tight outline-none [field-sizing:content]"
          />

          <div className="rounded-xl border px-4 py-2">
            <Property label="Assignee">
              <AssigneePicker
                workspaceId={workspaceId}
                value={task.assignedTo?._id}
                onChange={(user) =>
                  save(
                    { assignedTo: user?._id ?? null },
                    { assignedTo: user ? { ...user, profilePicture: user.profilePicture ?? null } : null }
                  )
                }
              >
                <IconCell className="-ml-1.5 text-foreground">
                  <AssigneeAvatar user={task.assignedTo} />
                  <span className="text-sm">{task.assignedTo?.name ?? "Unassigned"}</span>
                </IconCell>
              </AssigneePicker>
            </Property>
            <Property label="Due date">
              <DuePicker value={task.dueDate} onChange={(dueDate) => save({ dueDate })}>
                <IconCell className="-ml-1.5">
                  {task.dueDate ? (
                    <>
                      <DueLabel dueDate={task.dueDate} status={task.status} />
                      <span className="text-xs text-muted-foreground">· {format(new Date(task.dueDate), "EEE, MMM d")}</span>
                    </>
                  ) : (
                    <span className="text-sm">Set a date</span>
                  )}
                </IconCell>
              </DuePicker>
            </Property>
            <Property label="Priority">
              <PriorityPicker value={task.priority} onChange={(priority) => save({ priority })}>
                <IconCell className="-ml-1.5 text-foreground">
                  <PriorityFlag priority={task.priority} showLabel />
                </IconCell>
              </PriorityPicker>
            </Property>
          </div>

          <TaskDescription key={task._id} value={task.description} onSave={(markdown) => save({ description: markdown })} />

          {!parent && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                  <GitBranch className="h-4 w-4" /> Subtasks
                </h4>
                {subtasks.length > 0 && (
                  <>
                    <div className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-2 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {doneCount}/{subtasks.length}
                    </span>
                  </>
                )}
              </div>
              <div className="rounded-xl border p-1">
                {subtasks.map((subtask) => (
                  <SubtaskRow
                    key={subtask._id}
                    subtask={subtask}
                    workspaceId={workspaceId}
                    onOpen={() => onOpenTask({ taskId: subtask._id, projectId: projectIdOf(task) })}
                  />
                ))}
                <QuickAddTask
                  workspaceId={workspaceId}
                  projectId={projectIdOf(task)}
                  parentTask={task._id}
                  label={subtasks.length ? "Add subtask" : "Break this task into subtasks"}
                  placeholder="Subtask name"
                  compact
                />
              </div>
            </div>
          )}
        </div>

        {/* Side details */}
        <aside className="space-y-4 border-t bg-muted/20 px-5 py-5 text-sm md:border-l md:border-t-0">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
            <p className={cn("mt-1 font-medium", STATUS_META[task.status].text)}>{STATUS_META[task.status].label}</p>
          </div>
          {createdBy && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created by</p>
              <div className="mt-1.5 flex items-center gap-2">
                <AssigneeAvatar user={createdBy} />
                <span className="truncate">{createdBy.name}</span>
              </div>
            </div>
          )}
          {task.createdAt && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created</p>
              <p className="mt-1 text-muted-foreground">{format(new Date(task.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          )}
          {task.updatedAt && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last updated</p>
              <p className="mt-1 text-muted-foreground">{format(new Date(task.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          )}
          {update.isPending && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        isLoading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(
            { taskId: task._id, projectId: projectIdOf(task) },
            {
              onSuccess: () => {
                setConfirmDelete(false);
                if (parent) onOpenTask({ taskId: parent._id, projectId: projectIdOf(task) });
                else onClose();
              },
            }
          )
        }
        title={`Delete “${task.title}”?`}
        description={subtasks.length ? `Its ${subtasks.length} subtasks will be deleted too. This can't be undone.` : "This can't be undone."}
        confirmText="Delete task"
        cancelText="Keep it"
      />
    </>
  );
};

/** ClickUp-style task window: everything about a task, editable in place. */
const TaskDetailDialog = ({
  workspaceId,
  taskRef,
  onOpenTask,
  onClose,
}: {
  workspaceId: string;
  taskRef: TaskRef | null;
  onOpenTask: (ref: TaskRef) => void;
  onClose: () => void;
}) => (
  <Dialog open={!!taskRef} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="flex h-[min(88vh,820px)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
      <DialogTitle className="sr-only">Task details</DialogTitle>
      <DialogDescription className="sr-only">View and edit the task, its subtasks and details.</DialogDescription>
      {taskRef && (
        <TaskDetailBody key={taskRef.taskId} workspaceId={workspaceId} taskRef={taskRef} onOpenTask={onOpenTask} onClose={onClose} />
      )}
    </DialogContent>
  </Dialog>
);

export default TaskDetailDialog;
