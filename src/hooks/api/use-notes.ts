import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createNoteMutationFn,
  deleteNoteMutationFn,
  getNoteQueryFn,
  getNotesQueryFn,
  updateNoteMutationFn,
} from "@/lib/api";
import socketService from "@/lib/socket";
import { toast } from "@/hooks/use-toast";
import type { NoteSummaryType, NoteType, UpdateNotePayloadType } from "@/types/api.type";

export const noteKeys = {
  list: (workspaceId: string) => ["notes", workspaceId] as const,
  one: (workspaceId: string, noteId: string) => ["note", workspaceId, noteId] as const,
};

export const useNotes = (workspaceId: string) =>
  useQuery({
    queryKey: noteKeys.list(workspaceId),
    queryFn: () => getNotesQueryFn(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: (data) => data.notes,
  });

export const useNote = (workspaceId: string, noteId: string | undefined) =>
  useQuery({
    queryKey: noteKeys.one(workspaceId, noteId ?? ""),
    queryFn: () => getNoteQueryFn(workspaceId, noteId!),
    enabled: !!workspaceId && !!noteId,
    staleTime: 60_000,
    select: (data) => data.note,
  });

/** Put a saved note into the list cache so the page tree updates without a refetch */
const upsertSummary = (queryClient: QueryClient, workspaceId: string, note: NoteType) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, ...summary } = note;
  queryClient.setQueryData<{ notes: NoteSummaryType[] }>(noteKeys.list(workspaceId), (cache) => {
    if (!cache) return cache;
    const rest = cache.notes.filter((n) => n._id !== note._id);
    return { notes: [summary, ...rest] };
  });
};

export const useCreateNote = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createNoteMutationFn>[0]["data"]) => createNoteMutationFn({ workspaceId, data }),
    onSuccess: ({ note }) => {
      queryClient.setQueryData(noteKeys.one(workspaceId, note._id), { note });
      upsertSummary(queryClient, workspaceId, note);
    },
    onError: (error: Error) => toast({ title: "Couldn't create the page", description: error.message, variant: "destructive" }),
  });
};

/** Saves a note. The editor keeps its own state, so we only refresh the caches. */
export const useUpdateNote = (workspaceId: string, noteId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateNotePayloadType) => updateNoteMutationFn({ workspaceId, noteId, data }),
    onMutate: (data) => {
      // Title, icon and sharing show up in the page tree straight away
      queryClient.setQueryData<{ notes: NoteSummaryType[] }>(noteKeys.list(workspaceId), (cache) =>
        cache && { notes: cache.notes.map((n) => (n._id === noteId ? { ...n, ...data, updatedAt: new Date().toISOString() } : n)) }
      );
    },
    onSuccess: ({ note }) => {
      queryClient.setQueryData(noteKeys.one(workspaceId, noteId), { note });
      upsertSummary(queryClient, workspaceId, note);
    },
    onError: () => queryClient.invalidateQueries({ queryKey: noteKeys.list(workspaceId) }),
  });
};

export const useDeleteNote = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNoteMutationFn({ workspaceId, noteId }),
    onSuccess: ({ deletedIds }) => {
      const gone = new Set(deletedIds);
      queryClient.setQueryData<{ notes: NoteSummaryType[] }>(noteKeys.list(workspaceId), (cache) =>
        cache && { notes: cache.notes.filter((n) => !gone.has(n._id)) }
      );
      deletedIds.forEach((id) => queryClient.removeQueries({ queryKey: noteKeys.one(workspaceId, id) }));
    },
    onError: (error: Error) => toast({ title: "Couldn't delete the page", description: error.message, variant: "destructive" }),
  });
};

/** Other people's changes: refresh the page tree (open editors keep what you're typing) */
export const useNoteSocket = (workspaceId: string, currentUserId?: string) => {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      socketService.on("note:changed", (data: { workspaceId: string; noteId: string; by: string; action: string }) => {
        if (data.workspaceId !== workspaceId || data.by === currentUserId) return;
        queryClient.invalidateQueries({ queryKey: noteKeys.list(workspaceId) });
        if (data.action === "deleted") queryClient.removeQueries({ queryKey: noteKeys.one(workspaceId, data.noteId) });
      }),
    [queryClient, workspaceId, currentUserId]
  );
};
