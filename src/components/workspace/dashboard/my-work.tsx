import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUpdateTask } from "@/hooks/api/use-tasks";
import { projectIdOf } from "@/lib/task-meta";
import type { TaskType } from "@/types/api.type";
import { DueLabel, PriorityFlag, StatusDot } from "../task/views/task-pickers";

type Bucket = "overdue" | "today" | "week" | "later" | "none";
const BUCKETS: { id: Bucket; label: string; tone?: string }[] = [
  { id: "overdue", label: "Overdue", tone: "text-red-500" },
  { id: "today", label: "Today", tone: "text-amber-600 dark:text-amber-400" },
  { id: "week", label: "Next 7 days" },
  { id: "later", label: "Later" },
  { id: "none", label: "No due date" },
];

const bucketOf = (task: TaskType): Bucket => {
  if (!task.dueDate) return "none";
  const days = differenceInCalendarDays(new Date(task.dueDate), new Date());
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
};

const MyTaskRow = ({ task, workspaceId }: { task: TaskType; workspaceId: string }) => {
  const navigate = useNavigate();
  const update = useUpdateTask(workspaceId);
  const parentTitle = typeof task.parentTask === "object" && task.parentTask ? (task.parentTask as { title?: string }).title : null;
  const done = task.status === "DONE";

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
      <button
        type="button"
        onClick={() => update.mutate({ task: { _id: task._id, project: projectIdOf(task) }, data: { status: done ? "TODO" : "DONE" } })}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 hover:border-emerald-500 hover:bg-emerald-500/10"
        )}
        aria-label={done ? `Reopen "${task.title}"` : `Complete "${task.title}"`}
        title={done ? "Reopen" : "Mark complete"}
      >
        <Check className={cn("h-3 w-3", done ? "opacity-100" : "opacity-0 group-hover:opacity-60")} strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={() => navigate(`/workspace/${workspaceId}/tasks?task=${task._id}&taskProject=${projectIdOf(task)}`)}
        className="min-w-0 flex-1 text-left"
      >
        <span className={cn("block truncate text-sm", done && "text-muted-foreground line-through")}>{task.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {task.project ? `${task.project.emoji} ${task.project.name}` : ""}
          {parentTitle && ` › ${parentTitle}`}
        </span>
      </button>
      <StatusDot status={task.status} className="hidden h-3.5 w-3.5 sm:block" />
      <PriorityFlag priority={task.priority} />
      <span className="w-16 text-right">
        <DueLabel dueDate={task.dueDate} status={task.status} placeholder={false} />
      </span>
    </li>
  );
};

/** The signed-in person's open tasks, grouped by when they're due. */
const MyWork = ({ workspaceId, tasks, isLoading }: { workspaceId: string; tasks: TaskType[]; isLoading: boolean }) => {
  const grouped = useMemo(() => {
    const map = new Map<Bucket, TaskType[]>();
    tasks.forEach((task) => {
      const b = bucketOf(task);
      map.set(b, [...(map.get(b) ?? []), task]);
    });
    return map;
  }, [tasks]);

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">My work</CardTitle>
          <p className="text-xs text-muted-foreground">
            {tasks.length ? `${tasks.length} open ${tasks.length === 1 ? "task" : "tasks"} assigned to you` : "Tasks assigned to you show up here"}
          </p>
        </div>
        <Link
          to={`/workspace/${workspaceId}/tasks?quick=mine&sort=due`}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <PartyPopper className="h-7 w-7 text-primary" />
            <p className="text-sm font-medium text-foreground">You're all clear</p>
            <p className="text-xs">Nothing is assigned to you right now.</p>
          </div>
        ) : (
          <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
            {BUCKETS.filter((b) => grouped.get(b.id)?.length).map((bucket) => (
              <section key={bucket.id}>
                <h4 className={cn("mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", bucket.tone)}>
                  {bucket.label} · {grouped.get(bucket.id)!.length}
                </h4>
                <ul>
                  {grouped.get(bucket.id)!.slice(0, 8).map((task) => (
                    <MyTaskRow key={task._id} task={task} workspaceId={workspaceId} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyWork;
