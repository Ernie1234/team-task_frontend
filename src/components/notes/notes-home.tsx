import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FileText, Lock, Users } from "lucide-react";
import { useCreateNote, useNotes } from "@/hooks/api/use-notes";
import { NOTE_TEMPLATES } from "@/lib/note-templates";
import { noteTitle } from "./note-tree";

/** Landing screen: start a page from a template, or jump back into a recent one */
export default function NotesHome({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const { data: notes = [] } = useNotes(workspaceId);
  const createNote = useCreateNote(workspaceId);
  const recent = notes.slice(0, 8);

  const start = (templateId: string) => {
    const template = NOTE_TEMPLATES.find((t) => t.id === templateId)!;
    createNote.mutate(
      { title: template.title, emoji: template.emoji, content: template.blocks() as unknown as Record<string, unknown>[] },
      { onSuccess: ({ note }) => navigate(`/workspace/${workspaceId}/notes/${note._id}${template.id === "blank" ? "?new=1" : ""}`) }
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-14 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Jot it down</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Pages for ideas, meeting notes and plans. Type <kbd className="rounded border bg-muted px-1 font-mono text-xs">/</kbd> for headings,
          to-dos, quotes, code and more. Keep pages private or share them with your workspace.
        </p>

        <h2 className="mt-10 text-sm font-semibold">Start a page</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NOTE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={createNote.isPending}
              onClick={() => start(template.id)}
              className="group flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl">
                {template.emoji ?? <FileText className="h-5 w-5 text-muted-foreground" />}
              </span>
              <span className="font-medium">{template.name}</span>
              <span className="text-xs text-muted-foreground">{template.description}</span>
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <>
            <h2 className="mt-10 text-sm font-semibold">Recently edited</h2>
            <ul className="mt-2 divide-y rounded-2xl border bg-card">
              {recent.map((note) => (
                <li key={note._id}>
                  <Link to={`/workspace/${workspaceId}/notes/${note._id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <span className="flex w-6 justify-center text-lg">{note.emoji || <FileText className="h-4 w-4 text-muted-foreground" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{noteTitle(note)}</span>
                      {note.excerpt && <span className="block truncate text-xs text-muted-foreground">{note.excerpt}</span>}
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                      {note.visibility === "workspace" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
