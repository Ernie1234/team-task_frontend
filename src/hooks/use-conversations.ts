import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getWorkspaceConversationsQueryFn } from "@/lib/api";
import type { Conversation } from "@/types/chat.type";
import type { Message } from "@/lib/socket";

export const conversationsQueryKey = (workspaceId: string) =>
  ["chat-conversations", workspaceId] as const;

const time = (c: Conversation) => (c.lastMessage ? new Date(c.lastMessage.createdAt).getTime() : 0);
const typeOrder: Record<Conversation["type"], number> = { workspace: 0, project: 1, direct: 2 };

// Most recent activity first; quiet conversations after (channels, then people A–Z)
export const sortConversations = (list: Conversation[]) =>
  [...list].sort((a, b) => {
    const diff = time(b) - time(a);
    if (diff !== 0) return diff;
    if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
    return a.name.localeCompare(b.name);
  });

export const useConversations = (workspaceId?: string) =>
  useQuery({
    queryKey: conversationsQueryKey(workspaceId ?? ""),
    queryFn: async () => (await getWorkspaceConversationsQueryFn(workspaceId!)).conversations,
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: sortConversations,
  });

export const useChatUnreadTotal = (workspaceId?: string) => {
  const { data } = useConversations(workspaceId);
  return (data ?? []).reduce((total, c) => total + c.unreadCount, 0);
};

const updateRoom = (
  queryClient: QueryClient,
  roomId: string,
  update: (conversation: Conversation) => Conversation
) => {
  let found = false;
  queryClient.setQueriesData<Conversation[]>({ queryKey: ["chat-conversations"] }, (list) =>
    list?.map((conversation) => {
      if (conversation.id !== roomId) return conversation;
      found = true;
      return update(conversation);
    })
  );
  return found;
};

/** A message arrived: refresh the preview and, if it isn't on screen, the unread count. */
export const applyNewMessage = (
  queryClient: QueryClient,
  roomId: string,
  message: Message,
  { myId, activeRoomId }: { myId?: string; activeRoomId: string | null }
) => {
  const countsAsUnread = message.sender?._id !== myId && roomId !== activeRoomId;
  const found = updateRoom(queryClient, roomId, (conversation) => ({
    ...conversation,
    lastMessage: message,
    unreadCount: conversation.unreadCount + (countsAsUnread ? 1 : 0),
  }));
  // A room we don't list yet (e.g. a project created a moment ago)
  if (!found) queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
};

/** An edit/delete changed a message: keep the preview in sync if it's the last one. */
export const applyMessageChange = (
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
  patch: Partial<Message>
) => {
  updateRoom(queryClient, roomId, (conversation) =>
    conversation.lastMessage?._id === messageId
      ? { ...conversation, lastMessage: { ...conversation.lastMessage, ...patch } }
      : conversation
  );
};

export const applyRoomRead = (queryClient: QueryClient, roomId: string) => {
  updateRoom(queryClient, roomId, (conversation) =>
    conversation.unreadCount === 0 ? conversation : { ...conversation, unreadCount: 0 }
  );
};
