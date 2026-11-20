import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { FileText, Loader2, Paperclip, Pencil, Reply, SendHorizontal, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import socketService, { type Message } from "@/lib/socket";
import useChatStore from "@/hooks/use-chat-store";
import { sendDraft, type Draft } from "@/lib/chat-send";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILES,
  fileProblem,
  formatBytes,
  messagePreview,
} from "@/lib/chat-files";
import { useResolvedMode } from "@/hooks/use-appearance";
import type { Conversation } from "@/types/chat.type";

export interface MessageInputHandle {
  addFiles: (files: FileList | File[]) => void;
  focus: () => void;
}

interface MessageInputProps {
  conversation: Conversation;
  myId?: string;
  me?: Draft["me"];
  replyTo: Message | null;
  editing: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSent: () => void;
}

type PendingFile = { id: string; file: File; previewUrl?: string };

const TYPING_IDLE_MS = 2500;

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ conversation, myId, me, replyTo, editing, onCancelReply, onCancelEdit, onSent }, ref) => {
    const [text, setText] = useState("");
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingRef = useRef(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout>>();
    const isConnected = useChatStore((s) => s.isConnected);
    const theme = useResolvedMode();

    const target = {
      workspace: conversation.workspace,
      project: conversation.project,
      otherUserId: conversation.otherUser?._id,
    };

    const resize = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, []);

    useEffect(resize, [text, resize]);

    // Switching conversation: start fresh
    useEffect(() => {
      setText("");
      setError(null);
      setFiles((current) => {
        current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
        return [];
      });
      textareaRef.current?.focus();
    }, [conversation.id]);

    // Editing puts the message text in the box
    useEffect(() => {
      if (editing) {
        setText(editing.content);
        setError(null);
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          el?.focus();
          el?.setSelectionRange(el.value.length, el.value.length);
        });
      }
    }, [editing]);

    useEffect(() => {
      if (replyTo) textareaRef.current?.focus();
    }, [replyTo]);

    const stopTyping = useCallback(() => {
      clearTimeout(typingTimer.current);
      if (typingRef.current) {
        typingRef.current = false;
        socketService.stopTyping(conversation.type, target);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation.id]);

    useEffect(() => stopTyping, [stopTyping]);

    const addFiles = useCallback((incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      if (list.length === 0) return;
      const problems: string[] = [];
      setFiles((current) => {
        const room = MAX_FILES - current.length;
        const accepted: PendingFile[] = [];
        for (const file of list) {
          const problem = fileProblem(file);
          if (problem) problems.push(problem);
          else if (accepted.length >= room) problems.push(`You can send up to ${MAX_FILES} files at a time.`);
          else
            accepted.push({
              id: `${file.name}-${file.size}-${Math.random()}`,
              file,
              previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
            });
        }
        return [...current, ...accepted];
      });
      setError(problems.length ? [...new Set(problems)].join(" ") : null);
      textareaRef.current?.focus();
    }, []);

    useImperativeHandle(ref, () => ({ addFiles, focus: () => textareaRef.current?.focus() }), [addFiles]);

    const removeFile = (id: string) =>
      setFiles((current) => {
        const file = current.find((f) => f.id === id);
        if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
        return current.filter((f) => f.id !== id);
      });

    const handleChange = (value: string) => {
      setText(value);
      if (editing) return;
      if (!typingRef.current && value.trim()) {
        typingRef.current = true;
        socketService.startTyping(conversation.type, target);
      }
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
    };

    const insertEmoji = (emoji: string) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? text.length;
      const end = el?.selectionEnd ?? text.length;
      const next = text.slice(0, start) + emoji + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    };

    const saveEdit = async () => {
      if (!editing) return;
      const content = text.trim();
      if (content === editing.content.trim()) return onCancelEdit();
      if (!content && !(editing.attachments?.length)) {
        setError("A message can't be empty. Delete it instead.");
        return;
      }
      setSending(true);
      try {
        await socketService.editMessage(editing._id, content);
        setText("");
        onCancelEdit();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSending(false);
      }
    };

    const send = async () => {
      if (sending) return;
      if (editing) return saveEdit();

      const content = text.trim();
      if (!content && files.length === 0) return;
      if (!me) {
        setError("Still loading your account. Try again in a moment.");
        return;
      }
      if (content.length > 2000) {
        setError("Messages can be up to 2,000 characters.");
        return;
      }

      setError(null);
      stopTyping();

      // Shows up immediately; the upload and server confirmation happen in the background
      sendDraft({
        conversation,
        content,
        replyTo,
        files: files.map((f) => f.file),
        me,
      });

      files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setText("");
      onCancelReply();
      onSent();
      textareaRef.current?.focus();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        send();
      } else if (e.key === "Escape") {
        if (editing) {
          setText("");
          onCancelEdit();
        } else if (replyTo) onCancelReply();
      }
    };

    const onPaste = (e: React.ClipboardEvent) => {
      if (editing) return;
      const pasted = Array.from(e.clipboardData.files);
      if (pasted.length) {
        e.preventDefault();
        addFiles(pasted);
      }
    };

    const canSend = !sending && (text.trim().length > 0 || files.length > 0 || !!editing);
    const placeholder =
      conversation.type === "direct"
        ? `Message ${conversation.otherUser?.name.split(" ")[0] ?? ""}`
        : conversation.type === "workspace"
          ? "Message #general"
          : `Message ${conversation.name}`;

    return (
      <div className="bg-gradient-to-t from-background via-background to-background/0 px-3 pb-3 pt-2 sm:px-6">
        {(replyTo || editing) && (
          <div className="mx-auto mb-2 flex max-w-4xl items-start gap-2 rounded-2xl border-l-2 border-primary bg-muted/60 px-3 py-2 text-xs">
            {editing ? <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {editing
                  ? "Editing message"
                  : `Replying to ${replyTo!.sender?._id === myId ? "yourself" : replyTo!.sender?.name ?? "message"}`}
              </p>
              {!editing && <p className="truncate text-muted-foreground">{messagePreview(replyTo!)}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  setText("");
                  onCancelEdit();
                } else onCancelReply();
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={editing ? "Cancel editing" : "Cancel reply"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div className="mx-auto mb-2 flex max-w-4xl gap-2 overflow-x-auto pb-1" aria-label="Files to send">
            {files.map((f) => (
              <div key={f.id} className="relative shrink-0">
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt={f.file.name} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-44 items-center gap-2 rounded-xl bg-muted px-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{f.file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatBytes(f.file.size)}</p>
                    </div>
                  </div>
                )}
                {!sending && (
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mx-auto mb-2 max-w-4xl px-1 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="mx-auto flex max-w-4xl items-end gap-1">
          {!editing && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept={ACCEPTED_FILE_TYPES.join(",")}
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-1 h-9 w-9 shrink-0 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || files.length >= MAX_FILES}
                aria-label="Attach files"
                title="Attach photos or files (up to 10 MB each)"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </>
          )}

          <div className="flex min-h-11 flex-1 items-end rounded-3xl border bg-muted/60 pl-4 pr-1.5 shadow-sm transition-colors focus-within:border-primary/50 focus-within:bg-muted">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={placeholder}
              aria-label={placeholder}
              className="max-h-40 flex-1 resize-none bg-transparent py-3 text-[15px] leading-5 outline-none placeholder:text-muted-foreground"
            />
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-1.5 h-8 w-8 shrink-0 rounded-full text-muted-foreground"
                  aria-label="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-auto border-0 p-0 shadow-xl">
                <Picker
                  data={data}
                  theme={theme === "dark" ? "dark" : "light"}
                  previewPosition="none"
                  skinTonePosition="none"
                  onEmojiSelect={(emoji: { native: string }) => insertEmoji(emoji.native)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={!canSend}
            className="mb-1 h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-sm hover:brightness-110 disabled:bg-none disabled:bg-transparent disabled:text-muted-foreground disabled:shadow-none"
            aria-label={editing ? "Save edit" : "Send message"}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
          </Button>
        </div>

        <p className={cn("mx-auto mt-1.5 max-w-4xl px-1 text-[11px] text-muted-foreground", isConnected && "sr-only sm:not-sr-only")}>
          {!isConnected
            ? "Reconnecting… messages will still be sent."
            : editing
              ? "Enter to save · Esc to cancel"
              : "Enter to send · Shift + Enter for a new line"}
        </p>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";
export default MessageInput;
