import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useAuthContext } from "@/context/auth-provider";
import { useDeleteNote, useNoteSocket, useNotes } from "@/hooks/api/use-notes";
import { ConfirmDialog } from "@/components/resuable/confirm-dialog";
import NotesSidebar from "@/components/notes/notes-sidebar";
import NotePage from "@/components/notes/note-page";
import NotesHome from "@/components/notes/notes-home";
import { noteTitle } from "@/components/notes/note-tree";
import { cn } from "@/lib/utils";

type Deletable = { _id: string; title: string };

/** Notion-style notes: page tree + page editor, full height like Chat */
export default function Notes() {
  const workspaceId = useWorkspaceId();
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: notes = [] } = useNotes(workspaceId);
  const deleteNote = useDeleteNote(workspaceId);
  const [toDelete, setToDelete] = useState<Deletable | null>(null);
  useNoteSocket(workspaceId, user?._id);

  const subPageCount = toDelete ? countDescendants(toDelete._id, notes) : 0;

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0">
      <NotesSidebar
        workspaceId={workspaceId}
        activeId={noteId}
        currentUserId={user?._id}
        onDelete={setToDelete}
        className={cn(noteId && "hidden md:flex")}
      />
      <main className={cn("min-w-0 flex-1", !noteId && "hidden md:block")}>
        {noteId ? (
          <NotePage workspaceId={workspaceId} noteId={noteId} currentUserId={user?._id} onDelete={setToDelete} />
        ) : (
          <NotesHome workspaceId={workspaceId} />
        )}
      </main>

      <ConfirmDialog
        isOpen={!!toDelete}
        isLoading={deleteNote.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          deleteNote.mutate(toDelete._id, {
            onSuccess: ({ deletedIds }) => {
              setToDelete(null);
              if (noteId && deletedIds.includes(noteId)) navigate(`/workspace/${workspaceId}/notes`);
            },
          })
        }
        title={`Delete "${toDelete ? noteTitle(toDelete) : ""}"?`}
        description={
          subPageCount
            ? `This also deletes its ${subPageCount} sub-page${subPageCount === 1 ? "" : "s"}. This can't be undone.`
            : "This can't be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

function countDescendants(id: string, notes: { _id: string; parentNote: string | null }[]): number {
  const kids = notes.filter((n) => n.parentNote === id);
  return kids.reduce((sum, kid) => sum + 1 + countDescendants(kid._id, notes), 0);
}
