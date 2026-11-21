import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Block, BlockNoteEditor } from "@blocknote/core";
import { Check, ChevronRight, CloudOff, FileText, Link2, Loader2, Lock, MoreHorizontal, Plus, SmilePlus, Trash2, Users, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useCreateNote, useNote, useNotes, useUpdateNote } from "@/hooks/api/use-notes";
import type { NoteType, NoteVisibility, UpdateNotePayloadType } from "@/types/api.type";
import { blocksToPlainText } from "@/lib/editor-text";
import IconPicker from "./icon-picker";
import { ancestorsOf, noteTitle } from "./note-tree";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthContext } from "@/context/auth-provider";
import { NOTE_FRAGMENT, useNoteCollab, type NotePeer } from "@/hooks/use-note-collab";
import { cursorColor, type ClosedReason, type CollabStatus } from "@/lib/note-collab";
import { getAvatarFallbackText } from "@/lib/helper";

const RichEditor = lazy(() => import("@/components/editor/rich-editor"));

type SaveState = "saved" | "saving" | "error";

export default function NotePage({
  workspaceId,
  noteId,
  currentUserId,
  onDelete,
}: {
  workspaceId: string;
  noteId: string;
  currentUserId?: string;
  onDelete: (note: NoteType) => void;
}) {
  const { data: note, isLoading, isError } = useNote(workspaceId, noteId);

  if (isLoading) return <NoteSkeleton />;
  if (isError || !note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">This page isn't available</h2>
        <p className="max-w-sm text-sm text-muted-foreground">It may have been deleted, or it's a private page that belongs to someone else.</p>
        <Button variant="outline" asChild>
          <Link to={`/workspace/${workspaceId}/notes`}>Back to Notes</Link>
        </Button>
      </div>
    );
  }
  // Remount per note so the editor starts from that note's content
  return <NoteEditorView key={note._id} note={note} workspaceId={workspaceId} currentUserId={currentUserId} onDelete={onDelete} />;
}

function NoteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-24 sm:px-14">
      <Skeleton className="h-14 w-14 rounded-xl" />
      <Skeleton className="mt-6 h-11 w-2/3" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function NoteEditorView({
  note,
  workspaceId,
  currentUserId,
  onDelete,
}: {
  note: NoteType;
  workspaceId: string;
  currentUserId?: string;
  onDelete: (note: NoteType) => void;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isNew = params.get("new") === "1";
  const { data: notes = [] } = useNotes(workspaceId);
  const update = useUpdateNote(workspaceId, note._id);
  const createNote = useCreateNote(workspaceId);

  const [title, setTitle] = useState(note.title);
  const [emoji, setEmoji] = useState(note.emoji);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const isOwner = String(note.createdBy?._id ?? note.createdBy) === currentUserId;

  // Live editing: everyone on this page edits one shared document
  const { user } = useAuthContext();
  const collab = useNoteCollab(workspaceId, note._id, note.content);
  const isLive = !!collab.provider && (collab.status === "ready" || collab.status === "offline");
  const collaboration = useMemo(
    () =>
      collab.provider && user
        ? {
            fragment: collab.provider.doc.getXmlFragment(NOTE_FRAGMENT),
            provider: collab.provider,
            user: { name: user.name, color: cursorColor(user._id) },
          }
        : undefined,
    [collab.provider, user]
  );

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const pending = useRef<UpdateNotePayloadType>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mutate = useRef(update.mutate);
  mutate.current = update.mutate;

  // ---- saving: changes are batched and sent after a short pause
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const data = pending.current;
    if (!Object.keys(data).length) return;
    pending.current = {};
    setSaveState("saving");
    mutate.current(data, {
      onSuccess: () => {
        if (!Object.keys(pending.current).length) setSaveState("saved");
      },
      onError: () => {
        // Keep the changes so the next edit (or Retry) sends them again
        pending.current = { ...data, ...pending.current };
        setSaveState("error");
      },
    });
  }, []);

  const queue = useCallback(
    (data: UpdateNotePayloadType, delay = 700) => {
      pending.current = { ...pending.current, ...data };
      setSaveState("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush]
  );

  // Save what's left when leaving the page or closing the tab
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New page: put the cursor in the title
  useEffect(() => {
    if (isNew) {
      titleRef.current?.focus();
      params.delete("new");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-grow the title
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const onContentChange = useCallback(
    (editor: BlockNoteEditor, { remote }: { remote: boolean }) => {
      // The live document is saved by the server; this keeps the copy used for previews and search
      // up to date. Only the person who typed sends it.
      if (remote) return;
      const blocks = editor.document as Block[];
      queue({ content: blocks as unknown as Record<string, unknown>[], excerpt: blocksToPlainText(blocks), live: true }, 1500);
    },
    [queue]
  );

  const ancestors = useMemo(() => ancestorsOf(note._id, notes), [note._id, notes]);
  const subPages = useMemo(() => notes.filter((n) => n.parentNote === note._id), [notes, note._id]);
  const visibility = notes.find((n) => n._id === note._id)?.visibility ?? note.visibility;
  const lastEdited = notes.find((n) => n._id === note._id)?.updatedAt ?? note.updatedAt;

  const setIcon = (value: string | null) => {
    setEmoji(value);
    queue({ emoji: value }, 0);
  };

  const setVisibility = (value: NoteVisibility) => {
    if (value === visibility) return;
    update.mutate(
      { visibility: value },
      {
        onSuccess: () => toast({ title: value === "workspace" ? "Shared with the workspace" : "Only you can see this page now" }),
        onError: (error) => toast({ title: "Couldn't change sharing", description: error.message, variant: "destructive" }),
      }
    );
  };

  const addSubPage = () =>
    createNote.mutate(
      { parentNote: note._id },
      { onSuccess: ({ note: created }) => navigate(`/workspace/${workspaceId}/notes/${created._id}?new=1`) }
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
          {ancestors.map((a) => (
            <span key={a._id} className="flex min-w-0 items-center gap-1">
              <Link to={`/workspace/${workspaceId}/notes/${a._id}`} className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground">
                {a.emoji && <span>{a.emoji}</span>}
                <span className="max-w-[140px] truncate">{noteTitle(a)}</span>
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </span>
          ))}
          <span className="flex min-w-0 items-center gap-1 px-1 text-foreground">
            {emoji && <span>{emoji}</span>}
            <span className="truncate">{title.trim() || "Untitled"}</span>
          </span>
        </nav>

        <PeerAvatars peers={collab.peers} />
        <LiveIndicator status={collab.status} />
        {collab.status !== "offline" && <SaveIndicator state={saveState} onRetry={flush} />}
        <span className="hidden text-xs text-muted-foreground lg:inline">
          Edited {formatDistanceToNow(new Date(lastEdited), { addSuffix: true })}
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              {visibility === "workspace" ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {visibility === "workspace" ? "Shared" : "Private"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <p className="px-2 pb-2 pt-1 text-sm font-medium">Who can see this page</p>
            {(
              [
                ["private", Lock, "Only me", "Private to you"],
                ["workspace", Users, "Everyone in the workspace", "All members can view and edit"],
              ] as const
            ).map(([value, Icon, label, hint]) => (
              <button
                key={value}
                type="button"
                disabled={!isOwner}
                onClick={() => setVisibility(value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors disabled:cursor-not-allowed",
                  visibility === value ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4", visibility === value ? "text-primary" : "text-muted-foreground")} />
                <span className="flex-1">
                  <span className="block text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                {visibility === value && <Check className="mt-0.5 h-4 w-4 text-primary" />}
              </button>
            ))}
            {!isOwner && <p className="px-2 pt-2 text-xs text-muted-foreground">Only {note.createdBy?.name ?? "the creator"} can change this.</p>}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={addSubPage}>
              <Plus className="mr-2 h-4 w-4" /> Add sub-page
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                navigator.clipboard?.writeText(window.location.href.split("?")[0]).then(() => toast({ title: "Link copied" }))
              }
            >
              <Link2 className="mr-2 h-4 w-4" /> Copy link
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(note)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete page
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Page */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-[820px] pb-40 pt-14 sm:pt-20">
          <div className="group/head px-6 sm:px-[54px]">
            {emoji ? (
              <IconPicker hasIcon onSelect={setIcon}>
                <button type="button" aria-label="Change icon" className="-ml-1 rounded-lg p-1 text-[64px] leading-none transition-colors hover:bg-muted">
                  {emoji}
                </button>
              </IconPicker>
            ) : (
              <div className="flex h-8 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/head:opacity-100">
                <IconPicker hasIcon={false} onSelect={setIcon}>
                  <Button variant="ghost" size="sm" className="-ml-2 h-7 gap-1.5 text-muted-foreground">
                    <SmilePlus className="h-4 w-4" /> Add icon
                  </Button>
                </IconPicker>
              </div>
            )}

            <textarea
              ref={titleRef}
              value={title}
              rows={1}
              placeholder="Untitled"
              aria-label="Page title"
              maxLength={200}
              onChange={(event) => {
                const value = event.target.value.replace(/\n/g, "");
                setTitle(value);
                queue({ title: value }, 500);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || (event.key === "ArrowDown" && event.currentTarget.selectionStart === title.length)) {
                  event.preventDefault();
                  const editor = editorRef.current;
                  if (editor) {
                    const first = editor.document[0];
                    if (first) editor.setTextCursorPosition(first, "start");
                    editor.focus();
                  }
                }
              }}
              className="mt-2 w-full resize-none overflow-hidden bg-transparent font-display text-[40px] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="mt-3">
            <Suspense fallback={<div className="space-y-3 px-6 sm:px-[54px]"><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>}>
              {collab.status === "closed" ? (
                <ClosedNotice reason={collab.closedReason} workspaceId={workspaceId} />
              ) : isLive && collaboration ? (
                <RichEditor
                  key="live"
                  collaboration={collaboration}
                  onChange={onContentChange}
                  editorRef={(editor) => (editorRef.current = editor)}
                />
              ) : (
                // Saved copy while the live document loads
                <RichEditor key="preview" initialBlocks={note.content as never} editable={false} />
              )}
            </Suspense>
          </div>

          {/* Sub-pages */}
          <div className="mt-10 px-6 sm:px-[54px]">
            {subPages.length > 0 && (
              <div className="mb-2 space-y-0.5">
                {subPages.map((page) => (
                  <Link
                    key={page._id}
                    to={`/workspace/${workspaceId}/notes/${page._id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[15px] transition-colors hover:bg-muted"
                  >
                    <span className="flex w-5 justify-center">{page.emoji || <FileText className="h-4 w-4 text-muted-foreground" />}</span>
                    <span className="truncate border-b border-foreground/20 font-medium">{noteTitle(page)}</span>
                  </Link>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={addSubPage}
              disabled={createNote.isPending}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add a sub-page
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  if (state === "error")
    return (
      <button type="button" onClick={onRetry} className="flex items-center gap-1 text-xs text-destructive hover:underline" aria-live="polite">
        <CloudOff className="h-3.5 w-3.5" /> Not saved · Retry
      </button>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
      <Check className="h-3 w-3" /> Saved
    </span>
  );
}

/** Who else has this page open */
function PeerAvatars({ peers }: { peers: NotePeer[] }) {
  if (!peers.length) return null;
  const shown = peers.slice(0, 4);
  const label =
    peers.length === 1 ? `${peers[0].name} is here` : `${peers[0].name} and ${peers.length - 1} other${peers.length > 2 ? "s" : ""} are here`;
  return (
    <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center -space-x-1.5" aria-label={label}>
          {shown.map((peer) => (
            <span
              key={peer.clientId}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background"
              style={{ backgroundColor: peer.color }}
            >
              {getAvatarFallbackText(peer.name)}
            </span>
          ))}
          {peers.length > shown.length && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
              +{peers.length - shown.length}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}

function LiveIndicator({ status }: { status: CollabStatus }) {
  if (status === "offline")
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" aria-live="polite">
        <WifiOff className="h-3.5 w-3.5" /> Offline · your changes will sync
      </span>
    );
  if (status === "connecting" || status === "seeding")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
      </span>
    );
  return null;
}

function ClosedNotice({ reason, workspaceId }: { reason: ClosedReason | null; workspaceId: string }) {
  const text =
    reason === "deleted"
      ? "This page was deleted."
      : reason === "private"
        ? "The owner made this page private, so you can't edit it anymore."
        : "This page isn't available anymore.";
  return (
    <div className="mx-6 flex flex-col items-start gap-3 rounded-lg border bg-muted/40 p-5 sm:mx-[54px]">
      <p className="text-sm">{text}</p>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/workspace/${workspaceId}/notes`}>Back to Notes</Link>
      </Button>
    </div>
  );
}
