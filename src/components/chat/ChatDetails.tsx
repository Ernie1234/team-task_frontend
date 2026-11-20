import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ImageOff, Mail, MessageCircle, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PresenceDot from "@/components/presence/presence-dot";
import useChatStore, { useUserPresence } from "@/hooks/use-chat-store";
import { getRoomAttachmentsQueryFn } from "@/lib/api";
import { fileUrl, formatBytes, isImageAttachment } from "@/lib/chat-files";
import { conversationTitle, initials, NO_MEMBERS } from "@/lib/chat-display";
import { formatLastSeen } from "@/lib/presence";
import { formatListTime } from "@/lib/chat-time";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat.type";
import ConversationAvatar from "./ConversationAvatar";

const attachmentsQueryKey = (roomId: string) => ["chat-attachments", roomId] as const;

const Section = ({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) => (
  <section className="border-t px-5 py-4">
    <h4 className="mb-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {title}
      {count !== undefined && count > 0 && <span className="tabular-nums">{count}</span>}
    </h4>
    {children}
  </section>
);

const SharedMedia = ({ roomId }: { roomId: string }) => {
  const { data, isPending, isError } = useQuery({
    queryKey: attachmentsQueryKey(roomId),
    queryFn: () => getRoomAttachmentsQueryFn(roomId),
    staleTime: 60_000,
  });

  const attachments = data?.attachments ?? [];
  const photos = attachments.filter(isImageAttachment);
  const files = attachments.filter((a) => !isImageAttachment(a));

  if (isPending) {
    return (
      <Section title="Shared photos">
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </Section>
    );
  }
  if (isError) {
    return (
      <Section title="Shared photos and files">
        <p className="text-xs text-muted-foreground">Couldn't load shared files.</p>
      </Section>
    );
  }

  return (
    <>
      <Section title="Shared photos" count={photos.length}>
        {photos.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageOff className="h-3.5 w-3.5" /> Photos sent here will show up here.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.slice(0, 9).map((photo, i) => (
              <a
                key={`${photo.messageId}-${photo.url}-${i}`}
                href={fileUrl(photo.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={`${photo.name} · ${photo.sender?.name ?? "Someone"}, ${formatListTime(photo.createdAt)}`}
              >
                <img src={fileUrl(photo.url)} alt={photo.name} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
              </a>
            ))}
          </div>
        )}
      </Section>
      <Section title="Shared files" count={files.length}>
        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground">Documents sent here will show up here.</p>
        ) : (
          <ul className="space-y-1">
            {files.slice(0, 8).map((file, i) => (
              <li key={`${file.messageId}-${file.url}-${i}`}>
                <a
                  href={fileUrl(file.url)}
                  download={file.name}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/70"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{file.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatBytes(file.size)} · {formatListTime(file.createdAt)}
                    </span>
                  </span>
                  <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
};

const PersonHeader = ({ conversation }: { conversation: Conversation }) => {
  const user = conversation.otherUser!;
  const presence = useUserPresence(user._id);
  const online = presence?.isOnline ?? user.isOnline;
  return (
    <div className="flex flex-col items-center px-5 pb-5 pt-8 text-center">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.profilePicture} alt="" />
          <AvatarFallback className="bg-muted text-xl">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <PresenceDot userId={user._id} fallbackOnline={user.isOnline} className="h-5 w-5 border-[3px]" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{user.name}</h3>
      <p className={cn("text-xs", online ? "text-green-500" : "text-muted-foreground")}>
        {online ? "Active now" : formatLastSeen(presence?.lastSeen ?? user.lastSeen)}
      </p>
      {user.role && (
        <span className="mt-2 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
          {user.role.toLowerCase()}
        </span>
      )}
      {user.email && (
        <a href={`mailto:${user.email}`} className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Mail className="h-3.5 w-3.5" /> {user.email}
        </a>
      )}
    </div>
  );
};

const ChannelHeader = ({
  conversation,
  myId,
  onMessageUser,
}: {
  conversation: Conversation;
  myId?: string;
  onMessageUser: (userId: string) => void;
}) => {
  const members = useChatStore((s) => (conversation.workspace ? s.onlineUsers[conversation.workspace] : undefined) ?? NO_MEMBERS);
  const online = members.filter((m) => m.isOnline).length;
  const sorted = [...members].sort((a, b) =>
    a.isOnline !== b.isOnline ? (a.isOnline ? -1 : 1) : a.name.localeCompare(b.name)
  );

  return (
    <>
      <div className="flex flex-col items-center px-5 pb-5 pt-8 text-center">
        <ConversationAvatar conversation={conversation} size="lg" />
        <h3 className="mt-3 text-lg font-semibold">{conversationTitle(conversation)}</h3>
        <p className="text-xs text-muted-foreground">
          {conversation.type === "workspace" ? "Everyone in the workspace" : "Project chat"} · {members.length} members
          {online > 0 && <span className="text-green-500"> · {online} online</span>}
        </p>
      </div>
      <Section title="Members" count={members.length}>
        <ul className="space-y-0.5">
          {sorted.map((member) => (
            <li key={member._id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.profilePicture} alt="" />
                  <AvatarFallback className="bg-muted text-xs">{initials(member.name)}</AvatarFallback>
                </Avatar>
                <PresenceDot userId={member._id} fallbackOnline={member.isOnline} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {member.name}
                  {member._id === myId && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {member.isOnline ? "Online" : formatLastSeen(member.lastSeen)}
                  {member.role && ` · ${member.role.toLowerCase()}`}
                </p>
              </div>
              {member._id !== myId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full opacity-60 group-hover:opacity-100"
                  onClick={() => onMessageUser(member._id)}
                  aria-label={`Message ${member.name}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
};

/** Right panel: who you're talking to, members, and what's been shared. */
const ChatDetails = ({
  conversation,
  myId,
  onMessageUser,
  onClose,
  className,
}: {
  conversation: Conversation;
  myId?: string;
  onMessageUser: (userId: string) => void;
  onClose: () => void;
  className?: string;
}) => (
  <aside className={cn("relative flex min-h-0 flex-col overflow-y-auto bg-background", className)} aria-label="Conversation details">
    <Button
      variant="ghost"
      size="icon"
      className="absolute right-3 top-3 h-8 w-8 rounded-full"
      onClick={onClose}
      aria-label="Close details"
    >
      <X className="h-4 w-4" />
    </Button>
    {conversation.type === "direct" && conversation.otherUser ? (
      <PersonHeader conversation={conversation} />
    ) : (
      <ChannelHeader conversation={conversation} myId={myId} onMessageUser={onMessageUser} />
    )}
    <SharedMedia roomId={conversation.id} />
  </aside>
);

export default ChatDetails;
