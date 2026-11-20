import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Lock, MoreHorizontal, Plus, Search, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateNote, useNotes } from "@/hooks/api/use-notes";
import type { NoteSummaryType } from "@/types/api.type";
import { buildTree, noteTitle } from "./note-tree";

const EXPANDED_KEY = "notes:expanded";
const readExpanded = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "[]");
  } catch {
    return [];
  }
};

type Props = {
  workspaceId: string;
  activeId?: string;
  currentUserId?: string;
  onDelete: (note: NoteSummaryType) => void;
  className?: string;
};

/** The page tree: Private and Shared sections, nested sub-pages, search */
export default function NotesSidebar({ workspaceId, activeId, currentUserId, onDelete, className }: Props) {
  const navigate = useNavigate();
  const { data: notes = [], isLoading } = useNotes(workspaceId);
  const createNote = useCreateNote(workspaceId);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(readExpanded()));

  const toggle = (id: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(id)) next.add(id);
      else next.delete(id);
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });

  const { children } = useMemo(() => buildTree(notes), [notes]);
  const sections = useMemo(() => {
    const { roots } = buildTree(notes);
    return [
      { id: "workspace", label: "Shared with workspace", icon: Users, items: roots.filter((n) => n.visibility === "workspace") },
      { id: "private", label: "Private", icon: Lock, items: roots.filter((n) => n.visibility === "private") },
    ];
  }, [notes]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return notes.filter((n) => noteTitle(n).toLowerCase().includes(q) || n.excerpt?.toLowerCase().includes(q)).slice(0, 30);
  }, [notes, query]);

  const newPage = (parentNote?: string, visibility?: "private" | "workspace") =>
    createNote.mutate(
      { parentNote: parentNote ?? null, visibility },
      {
        onSuccess: ({ note }) => {
          if (parentNote) toggle(parentNote, true);
          navigate(`/workspace/${workspaceId}/notes/${note._id}?new=1`);
        },
      }
    );

  const Row = ({ note, depth }: { note: NoteSummaryType; depth: number }) => {
    const kids = children.get(note._id) ?? [];
    const open = expanded.has(note._id);
    const active = note._id === activeId;
    return (
      <li>
        <div
          className={cn(
            "group relative flex h-8 items-center gap-1 rounded-md pr-1 text-sm transition-colors",
            active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground"
          )}
          style={{ paddingLeft: 4 + depth * 14 }}
        >
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => toggle(note._id)}
            className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10", !kids.length && "invisible")}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
          <Link to={`/workspace/${workspaceId}/notes/${note._id}`} className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex w-5 shrink-0 justify-center text-[15px] leading-none">
              {note.emoji || <FileText className="h-4 w-4 text-muted-foreground" />}
            </span>
            <span className={cn("truncate", !note.title.trim() && "text-muted-foreground")}>{noteTitle(note)}</span>
          </Link>
          <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Page options" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onSelect={() => newPage(note._id)}>
                  <Plus className="mr-2 h-4 w-4" /> Add sub-page
                </DropdownMenuItem>
                {String(note.createdBy?._id ?? note.createdBy) === currentUserId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(note)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              aria-label="Add sub-page"
              onClick={() => newPage(note._id)}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {open && kids.length > 0 && (
          <ul>
            {kids.map((kid) => (
              <Row key={kid._id} note={kid} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside className={cn("flex min-h-0 w-full flex-col border-r bg-muted/20 md:w-64 lg:w-72", className)}>
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <Link to={`/workspace/${workspaceId}/notes`} className="font-display text-xl font-bold tracking-tight">
          Notes
        </Link>
        <Button size="sm" className="h-8 gap-1" onClick={() => newPage()} disabled={createNote.isPending}>
          <Plus className="h-4 w-4" /> New page
        </Button>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages" className="h-8 bg-background pl-8 text-sm" />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label="Pages">
        {isLoading ? (
          <div className="space-y-2 px-2 pt-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : results ? (
          <ul className="pt-1">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No pages match "{query}"</li>}
            {results.map((note) => (
              <Row key={note._id} note={note} depth={0} />
            ))}
          </ul>
        ) : (
          sections.map((section) => (
            <div key={section.id} className="pt-3">
              <div className="group flex items-center justify-between px-2 pb-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <section.icon className="h-3 w-3" /> {section.label}
                </span>
                <button
                  type="button"
                  aria-label={`New ${section.id === "private" ? "private" : "shared"} page`}
                  onClick={() => newPage(undefined, section.id as "private" | "workspace")}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul>
                {section.items.length === 0 ? (
                  <li className="px-3 py-1.5 text-xs text-muted-foreground">
                    {section.id === "private" ? "Pages only you can see" : "Pages everyone in the workspace can edit"}
                  </li>
                ) : (
                  section.items.map((note) => <Row key={note._id} note={note} depth={0} />)
                )}
              </ul>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
