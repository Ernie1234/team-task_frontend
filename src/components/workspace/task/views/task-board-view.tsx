import { useState } from "react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, STATUS_ORDER } from "@/lib/task-meta";
import { useUpdateTask } from "@/hooks/api/use-tasks";
import type { TaskStatusEnumType } from "@/constant";
import type { TaskType } from "@/types/api.type";
import { AssigneeAvatar, DueLabel, PriorityFlag, StatusDot } from "./task-pickers";
import QuickAddTask from "./quick-add-task";

const TaskCard = ({
  task,
  showProject,
  onOpen,
  onDragStart,
  dragging,
}: {
  task: TaskType;
  showProject: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  dragging: boolean;
}) => {
  const progress = task.subtaskCount ? Math.round(((task.subtaskDoneCount ?? 0) / task.subtaskCount) * 100) : 0;
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
      aria-label={task.title}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "rotate-1 opacity-50"
      )}
    >
      {showProject && task.project && (
        <p className="mb-1 truncate text-[11px] text-muted-foreground">
          {task.project.emoji} {task.project.name}
        </p>
      )}
      <p className={cn("text-sm font-medium leading-snug", task.status === "DONE" && "text-muted-foreground line-through")}>
        {task.title}
      </p>

      {task.subtaskCount ? (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            {task.subtaskDoneCount}/{task.subtaskCount}
          </span>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <AssigneeAvatar user={task.assignedTo} />
        <DueLabel dueDate={task.dueDate} status={task.status} placeholder={false} />
        <span className="ml-auto flex items-center gap-2">
          <PriorityFlag priority={task.priority} />
          <span className="text-[10px] text-muted-foreground/70">{task.taskCode}</span>
        </span>
      </div>
    </article>
  );
};

/** Kanban board: drag a card to another column to change its status. */
const TaskBoardView = ({
  workspaceId,
  projectId,
  tasks,
  isLoading,
  onOpen,
}: {
  workspaceId: string;
  projectId?: string;
  tasks: TaskType[];
  isLoading?: boolean;
  onOpen: (task: TaskType) => void;
}) => {
  const update = useUpdateTask(workspaceId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatusEnumType | null>(null);

  const drop = (status: TaskStatusEnumType) => {
    const task = tasks.find((t) => t._id === dragId);
    setDragId(null);
    setOverColumn(null);
    if (task && task.status !== status) update.mutate({ task, data: { status } });
  };

  return (
    <div className="-mx-1 flex min-h-[60vh] gap-3 overflow-x-auto px-1 pb-4" aria-label="Task board">
      {STATUS_ORDER.map((status) => {
        const meta = STATUS_META[status];
        const column = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              if (overColumn !== status) setOverColumn(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverColumn(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(status);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-2xl border-t-[3px] bg-muted/40 p-2 transition-colors",
              meta.border,
              overColumn === status && "bg-muted ring-2 ring-inset " + meta.ring
            )}
            aria-label={`${meta.label}, ${column.length} tasks`}
          >
            <header className={cn("flex items-center gap-2 px-1.5 pb-2 pt-1", meta.text)}>
              <StatusDot status={status} className="h-3.5 w-3.5" />
              <h3 className="text-xs font-semibold uppercase tracking-wide">{meta.label}</h3>
              <span className="text-xs tabular-nums text-muted-foreground">{column.length}</span>
            </header>

            <div className="flex flex-1 flex-col gap-2">
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)
                : column.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      showProject={!projectId}
                      dragging={dragId === task._id}
                      onOpen={() => onOpen(task)}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", task._id);
                        setDragId(task._id);
                      }}
                    />
                  ))}
              {!isLoading && column.length === 0 && overColumn !== status && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop tasks here</p>
              )}
            </div>

            <div className="pt-2">
              <QuickAddTask workspaceId={workspaceId} projectId={projectId} status={status} compact />
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default TaskBoardView;
