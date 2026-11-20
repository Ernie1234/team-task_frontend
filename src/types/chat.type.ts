import type { Message, MessageAttachment } from "@/lib/socket";

export type ConversationType = "workspace" | "project" | "direct";

export interface ConversationUser {
  _id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  role?: string;
}

// One row in the chat sidebar: a channel or a DM, as returned by the API
export interface Conversation {
  id: string; // room id: "workspace:<id>" | "project:<id>" | "direct:<a>:<b>"
  type: ConversationType;
  name: string;
  emoji?: string;
  workspace?: string;
  project?: string;
  otherUser?: ConversationUser;
  lastMessage: Message | null;
  unreadCount: number;
}

export type UploadedAttachment = MessageAttachment;

export interface SharedAttachment extends MessageAttachment {
  messageId: string;
  sender: { _id: string; name: string } | null;
  createdAt: string;
}
