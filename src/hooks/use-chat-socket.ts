import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import socketService, { type NewMessageEvent } from "@/lib/socket";
import useChatStore from "@/hooks/use-chat-store";
import {
  applyMessageChange,
  applyNewMessage,
  applyRoomRead,
  useConversations,
} from "@/hooks/use-conversations";

/** Mark a room read on the server and locally (also clears other tabs). */
export const markRoomRead = (queryClient: ReturnType<typeof useQueryClient>, roomId: string) => {
  applyRoomRead(queryClient, roomId);
  socketService.markRoomRead(roomId).catch(() => {
    // Offline: it'll be marked read next time the conversation is opened
  });
};

/**
 * App-wide chat wiring (mounted once in AuthProvider):
 * - joins every channel in the workspace so previews and unread counts stay live
 * - keeps the conversation list in sync with incoming messages and read state
 * - marks the open conversation read as messages arrive while you're looking
 */
const useChatSocket = (userId?: string, workspaceId?: string) => {
  const queryClient = useQueryClient();
  const isConnected = useChatStore((state) => state.isConnected);
  const { data: conversations } = useConversations(userId ? workspaceId : undefined);
  const joined = useRef(new Set<string>());

  // Join channel rooms (re-join after every reconnect: the server forgets them)
  useEffect(() => {
    if (!isConnected) {
      joined.current.clear();
      return;
    }
    conversations
      ?.filter((c) => c.type !== "direct" && !joined.current.has(c.id))
      .forEach((c) => {
        joined.current.add(c.id);
        socketService
          .joinRoom(c.type, { workspace: c.workspace, project: c.project })
          .catch(() => joined.current.delete(c.id));
      });
  }, [isConnected, conversations]);

  useEffect(() => {
    if (!userId) return;

    const offNew = socketService.on("message:new", ({ message, roomId }: NewMessageEvent) => {
      const { activeRoomId } = useChatStore.getState();
      applyNewMessage(queryClient, roomId, message, { myId: userId, activeRoomId });
      if (message.attachments?.length) {
        queryClient.invalidateQueries({ queryKey: ["chat-attachments", roomId] });
      }
      if (
        roomId === activeRoomId &&
        message.sender?._id !== userId &&
        document.visibilityState === "visible"
      ) {
        markRoomRead(queryClient, roomId);
      }
    });

    const offEdited = socketService.on("message:edited", ({ roomId, messageId, content, isEdited }) =>
      applyMessageChange(queryClient, roomId, messageId, { content, isEdited })
    );
    const offDeleted = socketService.on("message:deleted", ({ roomId, messageId }) => {
      applyMessageChange(queryClient, roomId, messageId, { isDeleted: true, content: "", attachments: [] });
      queryClient.invalidateQueries({ queryKey: ["chat-attachments", roomId] });
    });
    const offRead = socketService.on("room:read", ({ roomId }) => applyRoomRead(queryClient, roomId));

    // Coming back to the tab counts as reading the open conversation
    const onVisible = () => {
      const { activeRoomId } = useChatStore.getState();
      if (document.visibilityState === "visible" && activeRoomId) {
        markRoomRead(queryClient, activeRoomId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      offNew();
      offEdited();
      offDeleted();
      offRead();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [queryClient, userId]);
};

export default useChatSocket;
