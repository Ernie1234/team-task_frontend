import { useMemo, useState } from "react";
import { Search, SquarePen, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import useChatStore from "@/hooks/use-chat-store";
import { prefetchRoom } from "@/hooks/use-room-messages";
import { formatListTime } from "@/lib/chat-time";
import { messagePreview } from "@/lib/chat-files";
import { conversationTitle, initials, NO_TYPERS } from "@/lib/chat-display";
import type { Conversation } from "@/types/chat.type";
import ConversationAvatar from "./ConversationAvatar";

type Filter = "all" | "unread" | "channels" | "people";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "channels", label: "Channels" },
  { id: "people", label: "People" },
];

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
  myId?: string;
  className?: string;
}

const ConversationRow = ({
  conversation,
  isActive,
  myId,
  onSelect,
}: {
  conversation: Conversation;
  isActive: boolean;
  myId?: string;
  onSelect: () => void;
}) => {
  const typers = useChatStore((state) => state.typingUsers[conversation.id] ?? NO_TYPERS);
  const others = typers.filter((t) => t.userId !== myId);
  const unread = conversation.unreadCount > 0;
  const last = conversation.lastMessage;

  let preview: React.ReactNode;
  if (others.length > 0) {
    preview = (
      <span className="text-primary">
        {conversation.type === "direct" ? "typing…" : `${others[0].userName.split(" ")[0]} is typing…`}
      </span>
    );
  } else if (last) {
    const who =
      last.sender?._id === myId
        ? "You: "
        : conversation.type !== "direct" && last.sender
          ? `${last.sender.name.split(" ")[0]}: `
          : "";
    preview = (
      <span className={cn(last.isDeleted && "italic")}>
        {who}
        {messagePreview(last)}
      </span>
    );
  } else {
    preview = conversation.type === "direct" ? "Say hi 👋" : "No messages yet";
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => prefetchRoom(conversation)}
      onFocus={() => prefetchRoom(conversation)}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
        "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-muted"
      )}
    >
      {isActive && <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-primary to-primary-2" aria-hidden />}
      <ConversationAvatar conversation={conversation} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
            {conversationTitle(conversation)}
          </p>
          {last && (
            <span className={cn("shrink-0 text-[11px] tabular-nums", unread ? "font-semibold text-primary" : "text-muted-foreground")}>
              {formatListTime(last.createdAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn("truncate text-xs", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {preview}
          </p>
          {unread && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-2 px-1.5 text-[11px] font-semibold text-primary-foreground"
              aria-label={`${conversation.unreadCount} unread`}
            >
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// Messenger's "Active now" row: who you can reach right this second
const ActiveNow = ({
  people,
  onSelect,
}: {
  people: Conversation[];
  onSelect: (conversation: Conversation) => void;
}) => {
  const presence = useChatStore((s) => s.presence);
  const online = people.filter((c) => presence[c.otherUser!._id]?.isOnline ?? c.otherUser?.isOnline);
  if (online.length === 0) return null;

  return (
    <div className="px-4 pb-1">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active now</p>
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-2">
        {online.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            onMouseEnter={() => prefetchRoom(c)}
            className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Message ${c.otherUser!.name}`}
          >
            <span className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-green-500/70 ring-offset-2 ring-offset-background">
                <AvatarImage src={c.otherUser!.profilePicture} alt="" />
                <AvatarFallback className="bg-muted text-sm">{initials(c.otherUser!.name)}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
            </span>
            <span className="w-full truncate text-center text-[11px] text-muted-foreground">
              {c.otherUser!.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Left panel: search, who's online, filters and every conversation. */
const ChatSidebar = ({ conversations, activeId, onSelect, isLoading, myId, className }: ChatSidebarProps) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const people = useMemo(() => conversations.filter((c) => c.type === "direct" && c.otherUser), [conversations]);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && c.unreadCount === 0) return false;
      if (filter === "channels" && c.type === "direct") return false;
      if (filter === "people" && c.type !== "direct") return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.type === "workspace" && "general".includes(q)) ||
        !!c.otherUser?.email?.toLowerCase().includes(q)
      );
    });
  }, [conversations, query, filter]);

  const emptyText = query
    ? `Nobody or nothing called “${query}”.`
    : filter === "unread"
      ? "You're all caught up."
      : filter === "people"
        ? "No one else is in this workspace yet. Invite people from Members."
        : "No conversations yet.";

  return (
    <aside className={cn("flex min-h-0 flex-col bg-background", className)} aria-label="Conversations">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Chats</h2>
          {totalUnread > 0 && (
            <span className="text-xs font-medium text-primary">{totalUnread} unread</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setFilter("people");
            setQuery("");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="New message"
          title="New message"
        >
          <SquarePen className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people and channels"
            className="h-10 rounded-full border-0 bg-muted pl-9 pr-8 focus-visible:ring-1"
            aria-label="Search people and channels"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isLoading && !query && <ActiveNow people={people} onSelect={onSelect} />}

      <div className="flex gap-1.5 px-4 pb-2" role="tablist" aria-label="Show">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === f.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {f.id === "unread" && totalUnread > 0 && ` · ${totalUnread}`}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="space-y-1 px-1 pt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
                myId={myId}
                onSelect={() => onSelect(conversation)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
