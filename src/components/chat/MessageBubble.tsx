import { memo, useState } from "react";
import { Copy, CornerUpLeft, Download, FileText, MoreHorizontal, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/resuable/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import socketService, { type Message, type MessageAttachment } from "@/lib/socket";
import { fileUrl, formatBytes, isImageAttachment, messagePreview } from "@/lib/chat-files";
import { formatFullTime, formatMessageTime } from "@/lib/chat-time";
import { initials } from "@/lib/chat-display";
import { discardFailed, retrySend } from "@/lib/chat-send";
import useChatStore from "@/hooks/use-chat-store";

// Optimistic (sending/failed) messages only exist in the open conversation
const openRoomId = () => useChatStore.getState().activeRoomId ?? "";

export type BubblePosition = "single" | "first" | "middle" | "last";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  myId?: string;
  position: BubblePosition;
  // Group chats show who's talking; DMs don't need to
  showSenderName: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Your bubbles share one screen-sized gradient (background-attachment: fixed),
// so they shift through your theme's two accent colours from top to bottom.
const MINE_BG =
  "bg-[linear-gradient(180deg,hsl(var(--primary))_0%,hsl(var(--primary-2))_100%)] bg-fixed text-primary-foreground";

// A message that is only 1–3 emoji is shown large, without a bubble
const isJumboEmoji = (text: string) =>
  text.length <= 12 && /^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u.test(text) && !/^\d+$/.test(text);

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

const Linkified = ({ text, isMine }: { text: string; isMine: boolean }) => (
  <>
    {text.split(URL_PATTERN).map((part, i) =>
      i % 2 === 1 ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("underline underline-offset-2 break-all", isMine ? "text-primary-foreground" : "text-primary")}
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    )}
  </>
);

const Attachments = ({ attachments, isMine }: { attachments: MessageAttachment[]; isMine: boolean }) => {
  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter((a) => !isImageAttachment(a));

  return (
    <div className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
      {images.length > 0 && (
        <div className={cn("grid gap-1", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.map((image) => (
            <a
              key={image.url}
              href={fileUrl(image.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={image.name}
            >
              <img
                src={fileUrl(image.url)}
                alt={image.name}
                loading="lazy"
                className={cn(
                  "object-cover transition-opacity hover:opacity-90",
                  images.length > 1 ? "h-36 w-36 sm:h-40 sm:w-40" : "max-h-80 w-auto max-w-[min(18rem,70vw)]"
                )}
              />
            </a>
          ))}
        </div>
      )}
      {files.map((file) => (
        <a
          key={file.url}
          href={fileUrl(file.url)}
          download={file.name}
          className={cn(
            "flex w-64 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
            isMine ? `${MINE_BG} hover:brightness-110` : "bg-muted hover:bg-muted/70"
          )}
        >
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isMine ? "bg-primary-foreground/15" : "bg-background")}>
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{file.name}</span>
            <span className={cn("block text-xs", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {formatBytes(file.size)}
            </span>
          </span>
          <Download className="h-4 w-4 shrink-0 opacity-70" />
        </a>
      ))}
    </div>
  );
};

const Reactions = ({ message, myId, isMine }: { message: Message; myId?: string; isMine: boolean }) => {
  if (!message.reactions?.length) return null;

  const grouped = message.reactions.reduce<Record<string, { id: string; name?: string }[]>>((acc, r) => {
    const user = typeof r.user === "string" ? { id: r.user } : { id: r.user._id, name: r.user.name };
    (acc[r.emoji] ??= []).push(user);
    return acc;
  }, {});

  return (
    <div className={cn("relative z-[1] -mt-2 mb-1 flex flex-wrap gap-1 px-2", isMine ? "justify-end" : "justify-start")}>
      <TooltipProvider delayDuration={200}>
        {Object.entries(grouped).map(([emoji, users]) => {
          const mine = users.some((u) => u.id === myId);
          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => socketService.reactToMessage(message._id, emoji).catch(() => {})}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-full border bg-background px-1.5 text-xs shadow-sm transition-colors",
                    mine ? "border-primary/60 bg-primary/10" : "hover:bg-muted"
                  )}
                  aria-label={`${emoji} ${users.length}${mine ? ", including you" : ""}`}
                >
                  <span>{emoji}</span>
                  {users.length > 1 && <span className="tabular-nums">{users.length}</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {users.map((u) => (u.id === myId ? "You" : u.name ?? "Someone")).join(", ")}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

// Corner radius by position in a group: the side facing the sender's edge tightens
const cornerClass = (position: BubblePosition, isMine: boolean) => {
  const tight = isMine
    ? { first: "rounded-br-md", middle: "rounded-r-md", last: "rounded-tr-md" }
    : { first: "rounded-bl-md", middle: "rounded-l-md", last: "rounded-tl-md" };
  return position === "single" ? "" : tight[position];
};

const MessageBubble = ({ message, isMine, myId, position, showSenderName, onReply, onEdit }: MessageBubbleProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);

  const isFirst = position === "first" || position === "single";
  const isLast = position === "last" || position === "single";
  const attachments = message.attachments ?? [];
  const hasText = !!message.content && !message.isDeleted;
  const jumbo = hasText && attachments.length === 0 && !message.replyTo && isJumboEmoji(message.content);

  const react = (emoji: string) => {
    setReactOpen(false);
    socketService.reactToMessage(message._id, emoji).catch((error) =>
      toast({ title: "Couldn't add reaction", description: error.message, variant: "destructive" })
    );
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await socketService.deleteMessage(message._id);
      setConfirmDelete(false);
    } catch (error) {
      toast({ title: "Couldn't delete message", description: (error as Error).message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const pending = message.clientStatus === "sending";
  const failed = message.clientStatus === "failed";

  const actions = !message.isDeleted && !message.clientStatus && (
    <div
      className={cn(
        "flex items-center gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        (reactOpen) && "opacity-100",
        isMine ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Popover open={reactOpen} onOpenChange={setReactOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground" aria-label="React">
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-auto rounded-full p-1">
          <div className="flex gap-0.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-muted-foreground"
        onClick={() => onReply(message)}
        aria-label="Reply"
      >
        <CornerUpLeft className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isMine ? "end" : "start"}>
          {hasText && (
            <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(message.content)}>
              <Copy className="mr-2 h-4 w-4" /> Copy text
            </DropdownMenuItem>
          )}
          {isMine && (
            <>
              <DropdownMenuItem onClick={() => onEdit(message)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div
      className={cn(
        "group flex items-end gap-2 transition-opacity",
        isMine ? "flex-row-reverse" : "flex-row",
        isFirst ? "mt-3" : "mt-0.5",
        pending && "opacity-70"
      )}
    >
      {/* Avatar column (others only): shown next to the last bubble of a group */}
      {!isMine && (
        <div className="w-7 shrink-0">
          {isLast && (
            <Avatar className="h-7 w-7">
              <AvatarImage src={message.sender?.profilePicture} alt={message.sender?.name} />
              <AvatarFallback className="bg-muted text-[10px]">{initials(message.sender?.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn("flex min-w-0 max-w-[75%] flex-col gap-1 sm:max-w-[65%]", isMine ? "items-end" : "items-start")}>
        {showSenderName && isFirst && !isMine && (
          <span className="px-3 text-xs text-muted-foreground">{message.sender?.name ?? "Deleted user"}</span>
        )}

        {message.isDeleted ? (
          <div
            className={cn(
              "rounded-[20px] border px-3.5 py-2 text-sm italic text-muted-foreground",
              cornerClass(position, isMine)
            )}
            title={formatFullTime(message.createdAt)}
          >
            {isMine ? "You deleted this message" : "Message deleted"}
          </div>
        ) : (
          <>
            {message.replyTo && (
              <div
                className={cn(
                  "max-w-full truncate rounded-2xl border-l-2 px-3 py-1.5 text-xs text-muted-foreground",
                  isMine ? "border-primary bg-primary/10" : "border-muted-foreground/40 bg-muted/50"
                )}
              >
                <span className="font-medium">
                  {message.replyTo.sender?._id === myId ? "You" : message.replyTo.sender?.name ?? "Someone"}:
                </span>{" "}
                {messagePreview(message.replyTo) || "a message"}
              </div>
            )}

            {attachments.length > 0 && <Attachments attachments={attachments} isMine={isMine} />}

            {hasText &&
              (jumbo ? (
                <p className="px-1 text-4xl leading-tight" title={formatFullTime(message.createdAt)}>
                  {message.content}
                </p>
              ) : (
                <div
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[15px] leading-snug",
                    isMine ? MINE_BG : "bg-muted text-foreground",
                    cornerClass(position, isMine)
                  )}
                  title={formatFullTime(message.createdAt)}
                >
                  <Linkified text={message.content} isMine={isMine} />
                </div>
              ))}
          </>
        )}

        <Reactions message={message} myId={myId} isMine={isMine} />

        {failed ? (
          <span className="flex items-center gap-2 px-2 text-[11px] text-destructive" role="alert">
            Not sent{message.clientError ? ` · ${message.clientError}` : ""}
            <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => retrySend(openRoomId(), message.clientId!)}>
              Retry
            </button>
            <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => discardFailed(openRoomId(), message.clientId!)}>
              Discard
            </button>
          </span>
        ) : pending ? (
          <span className="px-2 text-[11px] text-muted-foreground" role="status">
            {message.clientProgress !== undefined && message.clientProgress < 100
              ? `Uploading… ${message.clientProgress}%`
              : "Sending…"}
          </span>
        ) : (
          isLast && (
            <span className="px-2 text-[11px] text-muted-foreground">
              {formatMessageTime(message.createdAt)}
              {message.isEdited && !message.isDeleted && " · Edited"}
            </span>
          )
        )}
      </div>

      {actions}

      <ConfirmDialog
        isOpen={confirmDelete}
        isLoading={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete this message?"
        description="It will be removed for everyone in this conversation."
        confirmText="Delete"
        cancelText="Keep it"
      />
    </div>
  );
};

export default memo(MessageBubble);
