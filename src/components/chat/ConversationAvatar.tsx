import { Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PresenceDot from "@/components/presence/presence-dot";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat.type";
import { initials } from "@/lib/chat-display";

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = { sm: "h-8 w-8 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg" };

/** Channel badge (# or project emoji) or a person's avatar with a live presence dot. */
const ConversationAvatar = ({
  conversation,
  size = "md",
  showPresence = true,
}: {
  conversation: Pick<Conversation, "type" | "name" | "emoji" | "otherUser">;
  size?: Size;
  showPresence?: boolean;
}) => {
  if (conversation.type === "direct" && conversation.otherUser) {
    const user = conversation.otherUser;
    return (
      <div className="relative shrink-0">
        <Avatar className={sizes[size]}>
          <AvatarImage src={user.profilePicture} alt={user.name} />
          <AvatarFallback className="bg-muted">{initials(user.name)}</AvatarFallback>
        </Avatar>
        {showPresence && (
          <PresenceDot
            userId={user._id}
            fallbackOnline={user.isOnline}
            className={size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl",
        sizes[size],
        conversation.type === "workspace" ? "bg-primary/15 text-primary" : "bg-muted"
      )}
      aria-hidden
    >
      {conversation.type === "project" && conversation.emoji ? (
        <span className={size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl"}>
          {conversation.emoji}
        </span>
      ) : (
        <Hash className={size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      )}
    </div>
  );
};

export default ConversationAvatar;
