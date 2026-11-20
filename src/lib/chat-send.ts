import socketService, { type Message } from "@/lib/socket";
import useChatStore from "@/hooks/use-chat-store";
import { sendChatMessageRestFn, uploadChatFilesMutationFn } from "@/lib/api";
import type { Conversation } from "@/types/chat.type";

/**
 * Optimistic sending: the message appears instantly (marked "sending"), then
 * is swapped for the server's copy when it's confirmed. If anything fails the
 * bubble stays, marked "failed", and can be retried or discarded.
 */
export type Draft = {
  conversation: Conversation;
  content: string;
  replyTo: Message | null;
  files: File[];
  me: { _id: string; name: string; profilePicture?: string | null };
};

const drafts = new Map<string, { draft: Draft; previews: string[] }>();

const newClientId = () =>
  `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const targetId = (c: Conversation) =>
  c.type === "workspace" ? c.workspace! : c.type === "project" ? c.project! : c.otherUser!._id;

const optimisticCopy = (draft: Draft, clientId: string, previews: string[]): Message => {
  const now = new Date().toISOString();
  return {
    _id: clientId,
    clientId,
    clientStatus: "sending",
    content: draft.content,
    chatType: draft.conversation.type,
    sender: {
      _id: draft.me._id,
      name: draft.me.name,
      profilePicture: draft.me.profilePicture ?? undefined,
    },
    messageType: draft.files.length ? "file" : "text",
    attachments: draft.files.map((file, i) => ({
      url: previews[i],
      name: file.name,
      size: file.size,
      mimeType: file.type,
    })),
    replyTo: draft.replyTo
      ? {
          _id: draft.replyTo._id,
          content: draft.replyTo.content,
          sender: draft.replyTo.sender,
          attachments: draft.replyTo.attachments,
          isDeleted: draft.replyTo.isDeleted,
        }
      : null,
    isEdited: false,
    isDeleted: false,
    reactions: [],
    createdAt: now,
    updatedAt: now,
  };
};

const deliver = async (clientId: string) => {
  const entry = drafts.get(clientId);
  if (!entry) return;
  const { draft } = entry;
  const roomId = draft.conversation.id;
  const store = useChatStore.getState();

  try {
    let lastShown = -1;
    const attachments = draft.files.length
      ? await uploadChatFilesMutationFn(draft.files, (percent) => {
          // Don't re-render on every progress tick
          if (percent - lastShown >= 10 || percent === 100) {
            lastShown = percent;
            store.updateMessage(roomId, clientId, { clientProgress: percent });
          }
        })
      : undefined;

    let message: Message;
    if (socketService.isConnected()) {
      ({ message } = await socketService.sendMessage(draft.conversation.type, {
        content: draft.content,
        workspace: draft.conversation.workspace,
        project: draft.conversation.project,
        otherUserId: draft.conversation.otherUser?._id,
        replyTo: draft.replyTo?._id,
        attachments,
        clientId,
      }));
    } else {
      // Socket offline: send over HTTP so the message isn't lost
      message = await sendChatMessageRestFn({
        chatType: draft.conversation.type,
        targetId: targetId(draft.conversation),
        content: draft.content,
        replyTo: draft.replyTo?._id,
        attachments,
      });
    }

    useChatStore.getState().addMessage(roomId, message, clientId);
    entry.previews.forEach((url) => URL.revokeObjectURL(url));
    drafts.delete(clientId);
  } catch (e) {
    const err = e as { message?: string; response?: { data?: { message?: string } } };
    useChatStore.getState().updateMessage(roomId, clientId, {
      clientStatus: "failed",
      clientProgress: undefined,
      clientError: err.response?.data?.message || err.message || "Couldn't send",
    });
  }
};

export const sendDraft = (draft: Draft) => {
  const clientId = newClientId();
  const previews = draft.files.map((file) => URL.createObjectURL(file));
  drafts.set(clientId, { draft, previews });
  useChatStore.getState().addMessage(draft.conversation.id, optimisticCopy(draft, clientId, previews));
  void deliver(clientId);
  return clientId;
};

export const retrySend = (roomId: string, clientId: string) => {
  useChatStore.getState().updateMessage(roomId, clientId, {
    clientStatus: "sending",
    clientError: undefined,
  });
  void deliver(clientId);
};

export const discardFailed = (roomId: string, clientId: string) => {
  drafts.get(clientId)?.previews.forEach((url) => URL.revokeObjectURL(url));
  drafts.delete(clientId);
  useChatStore.getState().removeMessage(roomId, clientId);
};
