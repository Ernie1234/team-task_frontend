import { cn } from "@/lib/utils";
import { useUserPresence } from "@/hooks/use-chat-store";
import { formatLastSeen } from "@/lib/presence";

type PresenceDotProps = {
  userId?: string;
  // Used until live presence for this user arrives
  fallbackOnline?: boolean;
  className?: string;
};

/**
 * Green/grey dot for a user's live online status. Place it inside a
 * `relative` wrapper around an avatar; it sits on the bottom-right corner.
 */
const PresenceDot = ({ userId, fallbackOnline = false, className }: PresenceDotProps) => {
  const presence = useUserPresence(userId);
  const isOnline = presence?.isOnline ?? fallbackOnline;
  const label = isOnline ? "Online" : formatLastSeen(presence?.lastSeen);

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn(
        "absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-background transition-colors",
        isOnline ? "bg-green-500" : "bg-gray-400",
        className
      )}
    />
  );
};

export default PresenceDot;
