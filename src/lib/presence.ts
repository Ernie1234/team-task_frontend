import { formatDistanceToNow } from "date-fns";

// "Last seen 5 minutes ago" / "Offline"
export const formatLastSeen = (lastSeen?: string | null): string => {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Offline";
  return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
};
