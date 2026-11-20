import { MessageCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PresenceDot from "@/components/presence/presence-dot";
import { NO_MEMBERS } from "@/lib/chat-display";
import useChatStore from "@/hooks/use-chat-store";
import { formatLastSeen } from "@/lib/presence";
import { initials } from "@/lib/chat-display";

/** "3 members · 2 online" button in a channel header, listing who's around. */
const OnlineUsers = ({
  workspaceId,
  myId,
  onMessage,
}: {
  workspaceId: string;
  myId?: string;
  onMessage: (userId: string) => void;
}) => {
  const members = useChatStore((s) => s.onlineUsers[workspaceId] ?? NO_MEMBERS);
  const online = members.filter((m) => m.isOnline).length;
  const sorted = [...members].sort((a, b) =>
    a.isOnline !== b.isOnline ? (a.isOnline ? -1 : 1) : a.name.localeCompare(b.name)
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 px-0 py-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground">
          <Users className="h-3.5 w-3.5" />
          {members.length} {members.length === 1 ? "member" : "members"}
          {online > 0 && <span className="text-green-500">· {online} online</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">People in this workspace</p>
        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {sorted.map((member) => (
            <li key={member._id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.profilePicture} alt={member.name} />
                  <AvatarFallback className="bg-muted text-xs">{initials(member.name)}</AvatarFallback>
                </Avatar>
                <PresenceDot userId={member._id} fallbackOnline={member.isOnline} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {member.name}
                  {member._id === myId && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.isOnline ? "Online" : formatLastSeen(member.lastSeen)}
                </p>
              </div>
              {member._id !== myId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => onMessage(member._id)}
                  aria-label={`Message ${member.name}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default OnlineUsers;
