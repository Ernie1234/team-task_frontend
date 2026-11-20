import useChatStore from "@/hooks/use-chat-store";
import { getChatMessages } from "@/lib/api";
import type { Conversation } from "@/types/chat.type";

// One request per room at a time (React dev mode and hover-prefetch both
// try to load the same room; they share the request instead of repeating it)
const inflight = new Map<string, Promise<void>>();

export const loadRoomMessages = (conversation: Conversation, { force = false } = {}) => {
  const roomId = conversation.id;
  if (!force && roomId in useChatStore.getState().messages) return Promise.resolve();

  const existing = inflight.get(roomId);
  if (existing) return existing;

  const request = getChatMessages(conversation.type, {
    workspace: conversation.workspace,
    project: conversation.project,
    otherUserId: conversation.otherUser?._id,
    limit: 50,
  })
    .then((result) => {
      // Keep messages this device is still sending (they aren't on the server yet)
      const pending = (useChatStore.getState().messages[roomId] ?? []).filter((m) => m.clientStatus);
      useChatStore.getState().setMessages(roomId, [...result.messages, ...pending], result.hasMore);
    })
    .finally(() => inflight.delete(roomId));

  inflight.set(roomId, request);
  return request;
};

// Hovering a conversation starts loading it, so opening it feels instant
export const prefetchRoom = (conversation: Conversation) => {
  loadRoomMessages(conversation).catch(() => {
    // It'll load (and show any error) when actually opened
  });
};
