import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, Info, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NO_TYPERS } from "@/lib/chat-display";
import useChatStore from "@/hooks/use-chat-store";
import { markRoomRead } from "@/hooks/use-chat-socket";
import { useUserPresence } from "@/hooks/use-chat-store";
import { getChatMessages } from "@/lib/api";
import { loadRoomMessages } from "@/hooks/use-room-messages";
import type { Draft } from "@/lib/chat-send";
import type { Message } from "@/lib/socket";
import { formatDayLabel, sameDay } from "@/lib/chat-time";
import { formatLastSeen } from "@/lib/presence";
import type { Conversation } from "@/types/chat.type";
import ConversationAvatar from "./ConversationAvatar";
import { conversationTitle } from "@/lib/chat-display";
import MessageBubble, { type BubblePosition } from "./MessageBubble";
import MessageInput, { type MessageInputHandle } from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import OnlineUsers from "./OnlineUsers";

interface ChatInterfaceProps {
  conversation: Conversation;
  myId?: string;
  me?: Draft["me"];
  onBack?: () => void;
  onMessageUser: (userId: string) => void;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  className?: string;
}

const GROUP_GAP_MS = 5 * 60 * 1000;
const EMPTY: Message[] = [];

type ThreadItem =
  | { kind: "day"; key: string; date: string }
  | { kind: "message"; key: string; message: Message; position: BubblePosition };

// Day dividers + bubble positions (consecutive messages from one person within 5 min form a group)
const buildThread = (messages: Message[]): ThreadItem[] => {
  const items: ThreadItem[] = [];
  messages.forEach((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || !sameDay(prev.createdAt, message.createdAt)) {
      items.push({ kind: "day", key: `day-${message.createdAt}`, date: message.createdAt });
    }
    const joins = (a?: Message, b?: Message) =>
      !!a &&
      !!b &&
      a.sender?._id === b.sender?._id &&
      sameDay(a.createdAt, b.createdAt) &&
      Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < GROUP_GAP_MS;
    const withPrev = joins(prev, message);
    const withNext = joins(message, next);
    const position: BubblePosition =
      withPrev && withNext ? "middle" : withPrev ? "last" : withNext ? "first" : "single";
    items.push({ kind: "message", key: message._id, message, position });
  });
  return items;
};

const HeaderSubtitle = ({ conversation, myId, onMessageUser }: Pick<ChatInterfaceProps, "conversation" | "myId" | "onMessageUser">) => {
  const presence = useUserPresence(conversation.otherUser?._id);
  const typers = useChatStore((s) => s.typingUsers[conversation.id] ?? NO_TYPERS).filter((t) => t.userId !== myId);

  if (conversation.type === "direct") {
    if (typers.length) return <span className="text-primary">typing…</span>;
    const online = presence?.isOnline ?? conversation.otherUser?.isOnline;
    return (
      <span className={online ? "text-green-500" : undefined}>
        {online ? "Active now" : formatLastSeen(presence?.lastSeen ?? conversation.otherUser?.lastSeen)}
      </span>
    );
  }
  if (typers.length) {
    return <span className="text-primary">{typers[0].userName.split(" ")[0]} is typing…</span>;
  }
  return conversation.workspace ? (
    <OnlineUsers workspaceId={conversation.workspace} myId={myId} onMessage={onMessageUser} />
  ) : null;
};

const EmptyThread = ({ conversation }: { conversation: Conversation }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <ConversationAvatar conversation={conversation} size="lg" />
    <div>
      <p className="text-lg font-semibold">{conversationTitle(conversation)}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {conversation.type === "direct"
          ? `This is the start of your conversation with ${conversation.otherUser?.name}. Say hi 👋`
          : conversation.type === "workspace"
            ? "This is the start of #general, where the whole workspace talks."
            : `This is the start of the ${conversation.name} project chat.`}
      </p>
    </div>
  </div>
);

const ChatInterface = ({
  conversation,
  myId,
  me,
  onBack,
  onMessageUser,
  detailsOpen,
  onToggleDetails,
  className,
}: ChatInterfaceProps) => {
  const roomId = conversation.id;
  const queryClient = useQueryClient();
  const messages = useChatStore((s) => s.messages[roomId] ?? EMPTY);
  const loaded = useChatStore((s) => roomId in s.messages);
  const hasMore = useChatStore((s) => s.hasMoreMessages[roomId] ?? false);
  const typers = useChatStore((s) => s.typingUsers[roomId] ?? NO_TYPERS).filter((t) => t.userId !== myId);
  const isConnected = useChatStore((s) => s.isConnected);
  const { prependMessages, setActiveRoomId } = useChatStore.getState();

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [dragging, setDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputHandle>(null);
  const restoreFrom = useRef<number | null>(null);
  const stickToBottom = useRef(true);
  const dragDepth = useRef(0);

  const params = useMemo(
    () => ({ workspace: conversation.workspace, project: conversation.project, otherUserId: conversation.otherUser?._id }),
    [conversation.workspace, conversation.project, conversation.otherUser?._id]
  );

  // This conversation is on screen: it's read, and new messages here don't count as unread
  useEffect(() => {
    setActiveRoomId(roomId);
    markRoomRead(queryClient, roomId);
    setReplyTo(null);
    setEditing(null);
    stickToBottom.current = true;
    return () => setActiveRoomId(null);
  }, [roomId, queryClient, setActiveRoomId]);

  const loadLatest = useCallback(
    async (force = false) => {
      setLoadError(null);
      try {
        await loadRoomMessages(conversation, { force });
      } catch (error) {
        setLoadError((error as Error).message || "Couldn't load messages.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId]
  );

  // First open, and after reconnecting (messages may have been missed while offline)
  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (!loaded) loadLatest();
  }, [loaded, loadLatest]);
  useEffect(() => {
    if (isConnected && !wasConnected.current && loaded) loadLatest(true);
    wasConnected.current = isConnected;
  }, [isConnected, loaded, loadLatest]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    restoreFrom.current = scrollRef.current?.scrollHeight ?? null;
    try {
      const result = await getChatMessages(conversation.type, { ...params, before: messages[0]._id, limit: 50 });
      prependMessages(roomId, result.messages, result.hasMore);
    } catch {
      restoreFrom.current = null;
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages, conversation.type, params, prependMessages, roomId]);

  // Keep the view pinned: at the bottom for new messages, in place when older ones load above
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreFrom.current !== null) {
      el.scrollTop = el.scrollHeight - restoreFrom.current;
      restoreFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typers.length]);

  // Images and late layout change the height after render: stay pinned to the bottom
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const content = contentRef.current;
    const el = scrollRef.current;
    if (!content || !el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current && restoreFrom.current === null) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [loaded]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
    setAtBottom(nearBottom);
    if (el.scrollTop < 120) loadOlder();
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const thread = useMemo(() => buildThread(messages), [messages]);
  const isGroup = conversation.type !== "direct";

  // Drag files anywhere on the conversation to attach them
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const dragHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => hasFiles(e) && e.preventDefault(),
    onDragLeave: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      inputRef.current?.addFiles(e.dataTransfer.files);
    },
  };

  return (
    <section className={cn("relative flex min-h-0 min-w-0 flex-col", className)} aria-label={conversationTitle(conversation)} {...dragHandlers}>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-5">
        {onBack && (
          <Button variant="ghost" size="icon" className="-ml-1 h-8 w-8 rounded-full" onClick={onBack} aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onToggleDetails}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Show conversation details"
          >
            <ConversationAvatar conversation={conversation} size="md" />
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={onToggleDetails}
              className="block max-w-full truncate text-left text-base font-semibold leading-tight hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {conversationTitle(conversation)}
            </button>
            <div className="truncate text-xs text-muted-foreground">
              <HeaderSubtitle conversation={conversation} myId={myId} onMessageUser={onMessageUser} />
            </div>
          </div>
        </div>
        {onToggleDetails && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDetails}
            className={cn("h-9 w-9 rounded-full", detailsOpen && "bg-muted text-primary")}
            aria-label={detailsOpen ? "Hide details" : "Show details"}
            aria-pressed={detailsOpen}
          >
            <Info className="h-5 w-5" />
          </Button>
        )}
      </header>

      {/* Thread */}
      <div ref={scrollRef} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2 sm:px-6" role="log" aria-live="polite">
        {!loaded && !loadError ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading messages" />
          </div>
        ) : loadError && !loaded ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>Couldn't load messages. {loadError}</p>
            <Button variant="outline" size="sm" onClick={() => loadLatest(true)}>
              Try again
            </Button>
          </div>
        ) : (
          <div ref={contentRef} className="mx-auto flex min-h-full w-full max-w-4xl shrink-0 flex-col">
            {hasMore ? (
              <div className="flex justify-center py-3">
                {loadingOlder ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading older messages" />
                ) : (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={loadOlder}>
                    Load older messages
                  </Button>
                )}
              </div>
            ) : messages.length > 0 ? (
              <div className="pt-6">
                <EmptyThread conversation={conversation} />
              </div>
            ) : null}

            {messages.length === 0 && !hasMore ? (
              <EmptyThread conversation={conversation} />
            ) : (
              <div className="mt-auto">
                {thread.map((item) =>
                  item.kind === "day" ? (
                    <div key={item.key} className="my-4 flex items-center justify-center" role="separator">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {formatDayLabel(item.date)}
                      </span>
                    </div>
                  ) : (
                    <Fragment key={item.key}>
                      <MessageBubble
                        message={item.message}
                        isMine={item.message.sender?._id === myId}
                        myId={myId}
                        position={item.position}
                        showSenderName={isGroup}
                        onReply={(m) => {
                          setEditing(null);
                          setReplyTo(m);
                        }}
                        onEdit={(m) => {
                          setReplyTo(null);
                          setEditing(m);
                        }}
                      />
                    </Fragment>
                  )
                )}
              </div>
            )}
            <TypingIndicator users={typers} showNames={isGroup} />
          </div>
        )}
      </div>

      {!atBottom && (
        <Button
          variant="secondary"
          size="icon"
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full border shadow-md"
          aria-label="Jump to latest messages"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      <MessageInput
        ref={inputRef}
        conversation={conversation}
        myId={myId}
        me={me}
        replyTo={replyTo}
        editing={editing}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSent={() => {
          stickToBottom.current = true;
          requestAnimationFrame(scrollToBottom);
        }}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary bg-background/85 text-primary">
          <Upload className="h-8 w-8" />
          <p className="text-sm font-medium">Drop to attach</p>
        </div>
      )}
    </section>
  );
};

export default ChatInterface;
