import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  /** Small line above the title (date, workspace name, "Project"…) */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Shown left of the title, e.g. a project emoji */
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** The one page header used across the app: same type scale, spacing and action placement everywhere. */
export function PageHeader({ title, eyebrow, description, icon, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-card text-2xl shadow-sm">{icon}</span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>}
          <h1 className="mt-0.5 flex items-center gap-2 truncate font-display text-2xl font-bold tracking-tight sm:text-[28px] sm:leading-9">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A titled card section (settings, members…) */
export function SectionCard({
  title,
  description,
  action,
  children,
  tone = "default",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card", tone === "danger" && "border-destructive/40", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h2 className={cn("text-base font-semibold", tone === "danger" && "text-destructive")}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children ? <div className="px-5 pb-5 pt-4">{children}</div> : <div className="pb-5" />}
    </section>
  );
}
