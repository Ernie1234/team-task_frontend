import type { Conversation } from "@/types/chat.type";
import type { OnlineUser, TypingUser } from "@/lib/socket";

export const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

export const conversationTitle = (conversation: Pick<Conversation, "type" | "name">) =>
  conversation.type === "workspace" ? "# general" : conversation.name;

// Stable empty values for store selectors: returning a fresh [] from a
// selector makes zustand re-render forever.
export const NO_TYPERS: TypingUser[] = [];
export const NO_MEMBERS: OnlineUser[] = [];
