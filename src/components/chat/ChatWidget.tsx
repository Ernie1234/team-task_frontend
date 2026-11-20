import { Link } from "react-router-dom";
import { ArrowRight, Mail, MessageCircle, Users, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PresenceDot from "@/components/presence/presence-dot";
import { NO_MEMBERS } from "@/lib/chat-display";
import useChatStore from "@/hooks/use-chat-store";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useAuth from "@/hooks/api/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { formatLastSeen } from "@/lib/presence";
import { formatListTime } from "@/lib/chat-time";
import { messagePreview } from "@/lib/chat-files";
import { cn } from "@/lib/utils";
import type { OnlineUser } from "@/lib/socket";
import ConversationAvatar from "./ConversationAvatar";
import { conversationTitle, initials } from "@/lib/chat-display";

const MAX_AVATARS = 8;

const MemberAvatar = ({ member, isMe, chatUrl }: { member: OnlineUser; isMe: boolean; chatUrl: string }) => {
  const avatar = (
    <div className="relative">
      <Avatar className={cn("h-9 w-9 transition-opacity", !member.isOnline && "opacity-50")}>
        <AvatarImage src={member.profilePicture} alt={member.name} />
        <AvatarFallback className="bg-muted text-xs">{initials(member.name)}</AvatarFallback>
      </Avatar>
      <PresenceDot userId={member._id} fallbackOnline={member.isOnline} />
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isMe ? (
          <div tabIndex={0} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {avatar}
          </div>
        ) : (
          <Link
            to={`${chatUrl}?dm=${member._id}`}
            className="rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Message ${member.name}`}
          >
            {avatar}
          </Link>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-60 border bg-popover p-0 text-popover-foreground shadow-lg">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.profilePicture} alt="" />
            <AvatarFallback className="bg-muted text-xs">{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {member.name}
              {isMe && <span className="font-normal text-muted-foreground"> (you)</span>}
            </p>
            {member.role && (
              <p className="text-xs capitalize text-muted-foreground">{member.role.toLowerCase()}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5 border-t px-3 py-2.5 text-xs">
          <p className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", member.isOnline ? "bg-green-500" : "bg-gray-400")} />
            {member.isOnline ? "Online now" : formatLastSeen(member.lastSeen)}
          </p>
          {member.email && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{member.email}</span>
            </p>
          )}
        </div>
        {!isMe && (
          <p className="flex items-center gap-1.5 border-t px-3 py-2 text-xs font-medium text-primary">
            <MessageCircle className="h-3.5 w-3.5" /> Click to send a message
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

const ChatWidget = ({ className = "" }: { className?: string }) => {
  const { data: authData } = useAuth();
  const myId = authData?.user?._id;
  const workspaceId = useWorkspaceId();
  const members = useChatStore((s) => (workspaceId ? s.onlineUsers[workspaceId] : undefined) ?? NO_MEMBERS);
  const isConnected = useChatStore((s) => s.isConnected);
  const { data: conversations } = useConversations(workspaceId);

  const chatUrl = `/workspace/${workspaceId}/chat`;
  const onlineCount = members.filter((m) => m.isOnline).length;
  const offlineCount = members.length - onlineCount;
  const totalUnread = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
  const recent = (conversations ?? []).filter((c) => c.lastMessage).slice(0, 3);

  // Online first, then most recently seen
  const sortedMembers = [...members].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return new Date(b.lastSeen ?? 0).getTime() - new Date(a.lastSeen ?? 0).getTime();
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Chat Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge className="border-0 bg-gradient-to-r from-primary to-primary-2 text-xs text-primary-foreground">
                {totalUnread > 99 ? "99+" : totalUnread} unread
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              {onlineCount} online
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isConnected && (
          <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground" role="status">
            <WifiOff className="h-3.5 w-3.5" /> Reconnecting to chat…
          </p>
        )}

        {members.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Team · hover for details, click to message</span>
              <span>
                {onlineCount} online · {offlineCount} offline
              </span>
            </div>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap gap-2">
                {sortedMembers.slice(0, MAX_AVATARS).map((member) => (
                  <MemberAvatar key={member._id} member={member} isMe={member._id === myId} chatUrl={chatUrl} />
                ))}
                {sortedMembers.length > MAX_AVATARS && (
                  <Link
                    to={chatUrl}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground hover:bg-muted/70"
                    aria-label={`${sortedMembers.length - MAX_AVATARS} more people`}
                  >
                    +{sortedMembers.length - MAX_AVATARS}
                  </Link>
                )}
              </div>
            </TooltipProvider>
          </div>
        )}

        {recent.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Recent conversations</p>
            {recent.map((conversation) => {
              const last = conversation.lastMessage!;
              const who =
                last.sender?._id === myId ? "You: " : conversation.type !== "direct" && last.sender ? `${last.sender.name.split(" ")[0]}: ` : "";
              const unread = conversation.unreadCount > 0;
              return (
                <Link
                  key={conversation.id}
                  to={`${chatUrl}?room=${encodeURIComponent(conversation.id)}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <ConversationAvatar conversation={conversation} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
                        {conversationTitle(conversation)}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatListTime(last.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-xs", unread ? "text-foreground" : "text-muted-foreground")}>
                        {who}
                        {messagePreview(last)}
                      </p>
                      {unread && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-2 px-1 text-[10px] font-semibold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          isConnected && (
            <div className="py-2 text-center text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Click someone above to send them a message.</p>
            </div>
          )
        )}

        <Button asChild variant="outline" className="w-full justify-between">
          <Link to={chatUrl}>
            Open chat
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChatWidget;
