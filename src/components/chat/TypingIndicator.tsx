import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TypingUser } from "@/lib/socket";
import { initials } from "@/lib/chat-display";

// Three bouncing dots in an incoming bubble, like the person is about to reply
const TypingIndicator = ({ users, showNames }: { users: TypingUser[]; showNames: boolean }) => {
  if (users.length === 0) return null;
  const first = users[0];
  const label =
    users.length === 1
      ? `${first.userName} is typing`
      : users.length === 2
        ? `${first.userName} and ${users[1].userName} are typing`
        : `${users.length} people are typing`;

  return (
    <div className="mt-3 flex items-end gap-2" role="status" aria-label={label}>
      <Avatar className="h-7 w-7">
        <AvatarImage src={first.profilePicture} alt={first.userName} />
        <AvatarFallback className="bg-muted text-[10px]">{initials(first.userName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        {showNames && <span className="px-3 text-xs text-muted-foreground">{label}</span>}
        <div className="flex h-9 items-center gap-1 rounded-[20px] bg-muted px-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-muted-foreground/70 motion-safe:animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
