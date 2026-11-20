import { useRef, useState } from "react";
import { CornerDownLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateTask } from "@/hooks/api/use-tasks";
import type { TaskStatusEnumType } from "@/constant";
import useGetProjectsInWorkspaceQuery from "@/hooks/api/use-get-projects";

/**
 * ClickUp-style "+ Add task" row: type a name, press Enter, it's created in
 * this group (status) and project. Stays open for the next one.
 */
const QuickAddTask = ({
  workspaceId,
  projectId,
  status,
  parentTask,
  placeholder = "Task name",
  label = "Add task",
  className,
  compact,
}: {
  workspaceId: string;
  projectId?: string;
  status?: TaskStatusEnumType;
  parentTask?: string;
  placeholder?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [chosenProject, setChosenProject] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useCreateTask(workspaceId);

  // Without a project in scope, ask which project the task belongs to
  const { data: projectData } = useGetProjectsInWorkspaceQuery({ workspaceId, skip: !!projectId });
  const projects = projectData?.projects ?? [];
  const targetProject = projectId || chosenProject || projects[0]?._id;

  const submit = () => {
    const name = title.trim();
    if (!name || !targetProject) return;
    mutate(
      { projectId: targetProject, data: { title: name, status, parentTask } },
      { onSuccess: () => setTitle("") }
    );
    inputRef.current?.focus();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          compact ? "py-1.5" : "py-2",
          className
        )}
      >
        <Plus className="h-4 w-4" /> {label}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm focus-within:border-primary/60", className)}>
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setTitle("");
            setOpen(false);
          }
        }}
        onBlur={() => !title.trim() && setOpen(false)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {!projectId && projects.length > 1 && (
        <select
          value={targetProject}
          onChange={(e) => setChosenProject(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-7 max-w-[9rem] rounded-md border bg-background px-1 text-xs"
          aria-label="Project"
        >
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.emoji} {p.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={submit}
        disabled={!title.trim() || isPending || !targetProject}
        className="flex h-7 items-center gap-1 rounded-md bg-gradient-to-br from-primary to-primary-2 px-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
      >
        Save <CornerDownLeft className="h-3 w-3" />
      </button>
      {!targetProject && <span className="text-xs text-muted-foreground">Create a project first</span>}
    </div>
  );
};

export default QuickAddTask;
