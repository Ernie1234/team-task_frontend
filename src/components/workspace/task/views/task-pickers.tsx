import { forwardRef, useState } from "react";
import { CalendarDays, Check, Flag, UserRound, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/chat-display";
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
  formatDue,
  isOverdue,
} from "@/lib/task-meta";
import type { TaskPriorityEnumType, TaskStatusEnumType } from "@/constant";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";

// ---------- Status

export const StatusDot = ({ status, className }: { status: TaskStatusEnumType; className?: string }) => {
  const meta = STATUS_META[status];
  return status === "DONE" ? (
    <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", meta.dot, className)}>
      <Check className="h-3 w-3 text-white" strokeWidth={3} />
    </span>
  ) : (
    <span
      className={cn(
        "block h-4 w-4 rounded-full border-2",
        status === "BACKLOG" ? "border-dashed border-zinc-400" : `border-current ${meta.text}`,
        status === "IN_PROGRESS" && "bg-[conic-gradient(currentColor_0_50%,transparent_50%_100%)]",
        status === "IN_REVIEW" && "bg-[conic-gradient(currentColor_0_75%,transparent_75%_100%)]",
        className
      )}
    />
  );
};

export const StatusPicker = ({
  value,
  onChange,
  children,
  align = "start",
}: {
  value: TaskStatusEnumType;
  onChange: (status: TaskStatusEnumType) => void;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              onChange(status);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <StatusDot status={status} />
            <span className="flex-1 text-left">{STATUS_META[status].label}</span>
            {status === value && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export const StatusBadge = ({ status }: { status: TaskStatusEnumType }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide",
      STATUS_META[status].soft,
      STATUS_META[status].text
    )}
  >
    <StatusDot status={status} className="h-3 w-3" />
    {STATUS_META[status].label}
  </span>
);

// ---------- Priority

export const PriorityFlag = ({ priority, showLabel }: { priority?: TaskPriorityEnumType | null; showLabel?: boolean }) =>
  priority ? (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Flag className={cn("h-3.5 w-3.5 fill-current", PRIORITY_META[priority].flag)} />
      {showLabel && PRIORITY_META[priority].label}
    </span>
  ) : (
    <Flag className="h-3.5 w-3.5 text-muted-foreground/50" />
  );

export const PriorityPicker = ({
  value,
  onChange,
  children,
}: {
  value: TaskPriorityEnumType;
  onChange: (priority: TaskPriorityEnumType) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1" onClick={(e) => e.stopPropagation()}>
        {PRIORITY_ORDER.map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => {
              onChange(priority);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <PriorityFlag priority={priority} />
            <span className="flex-1 text-left">{PRIORITY_META[priority].label}</span>
            {priority === value && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// ---------- Assignee

export type Assignee = { _id: string; name: string; profilePicture?: string | null; email?: string } | null;

export const AssigneeAvatar = ({ user, size = "sm" }: { user: Assignee; size?: "sm" | "md" }) =>
  user ? (
    <Avatar className={size === "sm" ? "h-6 w-6" : "h-8 w-8"} title={user.name}>
      <AvatarImage src={user.profilePicture ?? undefined} alt={user.name} />
      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  ) : (
    <span
      className={cn(
        "flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/60",
        size === "sm" ? "h-6 w-6" : "h-8 w-8"
      )}
      title="Unassigned"
    >
      <UserRound className="h-3.5 w-3.5" />
    </span>
  );

export const AssigneePicker = ({
  workspaceId,
  value,
  onChange,
  children,
}: {
  workspaceId: string;
  value?: string | null;
  onChange: (user: Assignee) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const { data } = useGetWorkspaceMembers(workspaceId);
  const members = (data?.members ?? []).map((m) => m.userId).filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0" onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No one found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__unassign"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4 text-muted-foreground" /> Unassign
                </CommandItem>
              )}
              {members.map((member) => (
                <CommandItem
                  key={member._id}
                  value={`${member.name} ${member.email}`}
                  onSelect={() => {
                    onChange({ _id: member._id, name: member.name, profilePicture: member.profilePicture, email: member.email });
                    setOpen(false);
                  }}
                >
                  <AssigneeAvatar user={member} />
                  <span className="ml-2 flex-1 truncate">{member.name}</span>
                  {member._id === value && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ---------- Due date

export const DueLabel = ({
  dueDate,
  status,
  placeholder = true,
}: {
  dueDate?: string | null;
  status?: TaskStatusEnumType;
  placeholder?: boolean;
}) => {
  const label = formatDue(dueDate);
  if (!label) return placeholder ? <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/50" /> : null;
  const overdue = isOverdue(dueDate, status);
  const soon = !overdue && (label === "Today" || label === "Tomorrow") && status !== "DONE";
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        overdue ? "font-medium text-red-500" : soon ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
};

export const DuePicker = ({
  value,
  onChange,
  children,
}: {
  value?: string | null;
  onChange: (date: string | null) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : undefined;
  const quick = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(12, 0, 0, 0);
    onChange(d.toISOString());
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto gap-0 p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-32 flex-col gap-0.5 border-r p-2 text-sm">
          {[
            ["Today", 0],
            ["Tomorrow", 1],
            ["Next week", 7],
            ["In 2 weeks", 14],
          ].map(([label, days]) => (
            <button key={label} type="button" onClick={() => quick(days as number)} className="rounded-md px-2 py-1.5 text-left hover:bg-muted">
              {label}
            </button>
          ))}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-auto rounded-md px-2 py-1.5 text-left text-muted-foreground hover:bg-muted"
            >
              Clear date
            </button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            date.setHours(12, 0, 0, 0);
            onChange(date.toISOString());
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

// Compact ghost button used as a picker trigger inside rows and cards
export const IconCell = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ children, className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1.5 px-1.5 font-normal text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      {children}
    </Button>
  )
);
IconCell.displayName = "IconCell";
