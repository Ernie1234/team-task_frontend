import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import socketService, { Message, OnlineUser, TypingUser, ChatType, PresenceUpdate } from "@/lib/socket";

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatType;
  workspace?: string;
  project?: string;
  otherUser?: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
}

export interface UserPresence {
  isOnline: boolean;
  lastSeen: string | null;
}

interface TypingState {
  [roomId: string]: TypingUser[];
}

interface ChatState {
  // Connection state
  isConnected: boolean;
  connectionError?: string;
  
  // Current chat context
  activeRoom?: ChatRoom;
  // Room id of the conversation open on screen (null when chat isn't open)
  activeRoomId: string | null;
  setActiveRoomId: (roomId: string | null) => void;
  
  // Messages
  messages: { [roomId: string]: Message[] };
  
  // Users
  // Every member of a workspace, with their current online status
  onlineUsers: { [workspaceId: string]: OnlineUser[] };
  // Live presence keyed by userId (source of truth for online/offline)
  presence: { [userId: string]: UserPresence };
  
  // Typing indicators
  typingUsers: TypingState;
  
  // Rooms/Conversations
  workspaceRooms: { [workspaceId: string]: ChatRoom[] };
  projectRooms: { [projectId: string]: ChatRoom[] };
  directConversations: ChatRoom[];
  
  // Loading states
  loadingMessages: boolean;
  loadingOnlineUsers: boolean;
  sendingMessage: boolean;
  
  // Pagination
  hasMoreMessages: { [roomId: string]: boolean };
  
  // Actions
  setConnectionStatus: (connected: boolean, error?: string) => void;
  setActiveRoom: (room: ChatRoom) => void;
  clearActiveRoom: () => void;
  
  // Message actions
  // clientId: swap this device's optimistic copy for the real message
  addMessage: (roomId: string, message: Message, clientId?: string) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  setMessages: (roomId: string, messages: Message[], hasMore?: boolean) => void;
  prependMessages: (roomId: string, messages: Message[], hasMore?: boolean) => void;
  
  // User actions
  setOnlineUsers: (workspaceId: string, users: OnlineUser[]) => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => void;
  setPresence: (updates: PresenceUpdate[]) => void;
  resetPresence: () => void;
  
  // Typing actions
  setUserTyping: (roomId: string, user: TypingUser) => void;
  setUserStoppedTyping: (roomId: string, userId: string) => void;
  clearTypingUsers: (roomId: string) => void;
  
  // Room actions
  addRoom: (room: ChatRoom) => void;
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  setWorkspaceRooms: (workspaceId: string, rooms: ChatRoom[]) => void;
  setDirectConversations: (conversations: ChatRoom[]) => void;
  
  // Loading actions
  setLoadingMessages: (loading: boolean) => void;
  setSendingMessage: (sending: boolean) => void;
  
  // Utility actions
  getRoomId: (type: ChatType, workspace?: string, project?: string, otherUserId?: string) => string;
  markRoomAsRead: (roomId: string) => void;
  incrementUnreadCount: (roomId: string) => void;
}

const createRoomId = (type: ChatType, workspace?: string, project?: string, otherUserId?: string, currentUserId?: string): string => {
  switch (type) {
    case "workspace":
      return `workspace:${workspace}`;
    case "project":
      return `project:${project}`;
    case "direct": {
      // Direct message rooms need both user IDs sorted
      if (!otherUserId || !currentUserId) {
        throw new Error('Both user IDs required for direct messages');
      }
      const participants = [currentUserId, otherUserId].sort();
      return `direct:${participants.join(':')}`;
    }
    default:
      throw new Error(`Invalid chat type: ${type}`);
  }
};

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

const useChatStore = create<ChatState>()(subscribeWithSelector((set, get) => ({
  // Initial state
  isConnected: false,
  activeRoomId: null,
  setActiveRoomId: (roomId) => set({ activeRoomId: roomId }),
  messages: {},
  onlineUsers: {},
  presence: {},
  typingUsers: {},
  workspaceRooms: {},
  projectRooms: {},
  directConversations: [],
  loadingMessages: false,
  loadingOnlineUsers: false,
  sendingMessage: false,
  hasMoreMessages: {},
  
  // Connection actions
  setConnectionStatus: (connected, error) => {
    set({ isConnected: connected, connectionError: error });
  },
  
  // Room actions
  setActiveRoom: (room) => {
    set({ activeRoom: room });
    // Mark room as read when activated
    get().markRoomAsRead(room.id);
  },
  
  clearActiveRoom: () => {
    set({ activeRoom: undefined });
  },
  
  // Message actions
  addMessage: (roomId, message, clientId) => {
    set((state) => {
      const roomMessages = state.messages[roomId];
      // Room not loaded yet: its history (including this message) loads when opened
      if (!roomMessages) return {};

      // The confirmed version of a message we're showing optimistically: replace in place
      if (clientId) {
        const index = roomMessages.findIndex((m) => m.clientId === clientId);
        if (index >= 0) {
          const next = roomMessages.filter((m, i) => i === index || m._id !== message._id);
          const at = next.findIndex((m) => m.clientId === clientId);
          next[at] = message;
          return { messages: { ...state.messages, [roomId]: next } };
        }
      }

      if (roomMessages.some((m) => m._id === message._id)) return {};
      return {
        messages: {
          ...state.messages,
          [roomId]: [...roomMessages, message],
        },
      };
    });
  },

  removeMessage: (roomId, messageId) => {
    set((state) => {
      const roomMessages = state.messages[roomId];
      if (!roomMessages) return {};
      return {
        messages: { ...state.messages, [roomId]: roomMessages.filter((m) => m._id !== messageId) },
      };
    });
  },
  
  updateMessage: (roomId, messageId, updates) => {
    set((state) => {
      const roomMessages = state.messages[roomId] || [];
      const updatedMessages = roomMessages.map(msg => 
        msg._id === messageId ? { ...msg, ...updates } : msg
      );
      
      return {
        messages: {
          ...state.messages,
          [roomId]: updatedMessages,
        },
      };
    });
  },
  
  deleteMessage: (roomId, messageId) => {
    get().updateMessage(roomId, messageId, {
      isDeleted: true,
      content: "",
      attachments: [],
      reactions: [],
    });
  },
  
  setMessages: (roomId, messages, hasMore = false) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: messages,
      },
      hasMoreMessages: {
        ...state.hasMoreMessages,
        [roomId]: hasMore,
      },
    }));
  },
  
  prependMessages: (roomId, messages, hasMore = false) => {
    set((state) => {
      const existingMessages = state.messages[roomId] || [];
      const updatedMessages = [...messages, ...existingMessages];
      
      return {
        messages: {
          ...state.messages,
          [roomId]: updatedMessages,
        },
        hasMoreMessages: {
          ...state.hasMoreMessages,
          [roomId]: hasMore,
        },
      };
    });
  },
  
  // User actions
  setOnlineUsers: (workspaceId, users) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        // Live presence wins over whatever the REST response said
        [workspaceId]: users.map((user) => {
          const live = state.presence[user._id];
          return live
            ? { ...user, isOnline: live.isOnline, lastSeen: live.lastSeen ?? undefined }
            : user;
        }),
      },
    }));
  },
  
  updateUserOnlineStatus: (userId, isOnline) => {
    get().setPresence([
      {
        userId,
        isOnline,
        lastSeen: isOnline ? null : new Date().toISOString(),
      },
    ]);
  },

  setPresence: (updates) => {
    if (updates.length === 0) return;

    set((state) => {
      const presence = { ...state.presence };
      updates.forEach(({ userId, isOnline, lastSeen }) => {
        presence[userId] = { isOnline, lastSeen };
      });

      const byUser = new Map(updates.map((u) => [u.userId, u]));
      const onlineUsers: ChatState["onlineUsers"] = {};
      Object.entries(state.onlineUsers).forEach(([workspaceId, users]) => {
        onlineUsers[workspaceId] = users.map((user) => {
          const update = byUser.get(user._id);
          return update
            ? { ...user, isOnline: update.isOnline, lastSeen: update.lastSeen ?? undefined }
            : user;
        });
      });

      return { presence, onlineUsers };
    });
  },

  resetPresence: () => {
    set({ presence: {}, onlineUsers: {} });
  },
  
  // Typing actions
  setUserTyping: (roomId, user) => {
    // Clear it automatically if the "stopped typing" event never arrives
    const key = `${roomId}|${user.userId}`;
    clearTimeout(typingTimers.get(key));
    typingTimers.set(
      key,
      setTimeout(() => {
        typingTimers.delete(key);
        get().setUserStoppedTyping(roomId, user.userId);
      }, 6000)
    );

    set((state) => {
      const roomTyping = state.typingUsers[roomId] || [];
      const isAlreadyTyping = roomTyping.some(u => u.userId === user.userId);
      
      if (isAlreadyTyping) {
        return state; // No change needed
      }
      
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: [...roomTyping, user],
        },
      };
    });
  },
  
  setUserStoppedTyping: (roomId, userId) => {
    set((state) => {
      const roomTyping = state.typingUsers[roomId] || [];
      const updatedTyping = roomTyping.filter(u => u.userId !== userId);
      
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: updatedTyping,
        },
      };
    });
  },
  
  clearTypingUsers: (roomId) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [roomId]: [],
      },
    }));
  },
  
  // Room management
  addRoom: (room) => {
    set((state) => {
      if (room.type === "workspace") {
        const workspaceId = room.workspace!;
        const workspaceRooms = state.workspaceRooms[workspaceId] || [];
        
        return {
          workspaceRooms: {
            ...state.workspaceRooms,
            [workspaceId]: [...workspaceRooms, room],
          },
        };
      } else if (room.type === "direct") {
        return {
          directConversations: [...state.directConversations, room],
        };
      }
      
      return state;
    });
  },
  
  updateRoom: (roomId, updates) => {
    set((state) => {
      // Update in workspace rooms
      const updatedWorkspaceRooms = Object.fromEntries(
        Object.entries(state.workspaceRooms).map(([wId, rooms]) => [
          wId,
          rooms.map(room => room.id === roomId ? { ...room, ...updates } : room)
        ])
      );
      
      // Update in direct conversations
      const updatedDirectConversations = state.directConversations.map(room => 
        room.id === roomId ? { ...room, ...updates } : room
      );
      
      return {
        workspaceRooms: updatedWorkspaceRooms,
        directConversations: updatedDirectConversations,
      };
    });
  },
  
  setWorkspaceRooms: (workspaceId, rooms) => {
    set((state) => ({
      workspaceRooms: {
        ...state.workspaceRooms,
        [workspaceId]: rooms,
      },
    }));
  },
  
  setDirectConversations: (conversations) => {
    set({ directConversations: conversations });
  },
  
  // Loading actions
  setLoadingMessages: (loading) => {
    set({ loadingMessages: loading });
  },
  
  setSendingMessage: (sending) => {
    set({ sendingMessage: sending });
  },
  
  // Utility actions
  getRoomId: (type: ChatType, workspace?: string, project?: string, otherUserId?: string) => {
    // Get current user ID from window or store if needed
    // For now, we'll need to pass it from components
    return createRoomId(type, workspace, project, otherUserId, undefined);
  },
  
  markRoomAsRead: (roomId) => {
    get().updateRoom(roomId, { unreadCount: 0 });
  },
  
  incrementUnreadCount: (roomId) => {
    set((state) => {
      // Find the room and increment unread count
      const updatedWorkspaceRooms = Object.fromEntries(
        Object.entries(state.workspaceRooms).map(([wId, rooms]) => [
          wId,
          rooms.map(room => 
            room.id === roomId 
              ? { ...room, unreadCount: room.unreadCount + 1 }
              : room
          )
        ])
      );
      
      const updatedDirectConversations = state.directConversations.map(room => 
        room.id === roomId 
          ? { ...room, unreadCount: room.unreadCount + 1 }
          : room
      );
      
      return {
        workspaceRooms: updatedWorkspaceRooms,
        directConversations: updatedDirectConversations,
      };
    });
  },
})));

// Socket.IO event subscriptions
if (typeof window !== "undefined") {
  // Connection events
  socketService.on("connection:status", ({ connected, reason }) => {
    useChatStore.getState().setConnectionStatus(connected, reason);
  });
  
  socketService.on("connection:error", ({ error }) => {
    useChatStore.getState().setConnectionStatus(false, error);
  });
  
  // Message events (every payload carries its roomId)
  socketService.on("message:new", ({ message, roomId, clientId }: { message: Message; roomId: string; clientId?: string }) => {
    useChatStore.getState().addMessage(roomId, message, clientId);
    // The sender stopped typing the moment the message arrived
    if (message.sender?._id) {
      useChatStore.getState().setUserStoppedTyping(roomId, message.sender._id);
    }
  });

  socketService.on("message:edited", ({ roomId, messageId, content, isEdited, editedAt }) => {
    useChatStore.getState().updateMessage(roomId, messageId, { content, isEdited, editedAt });
  });

  socketService.on("message:deleted", ({ roomId, messageId }) => {
    useChatStore.getState().deleteMessage(roomId, messageId);
  });

  socketService.on("message:reaction", ({ roomId, messageId, reactions }) => {
    useChatStore.getState().updateMessage(roomId, messageId, { reactions });
  });
  
  // User presence events
  socketService.on("presence:update", (update: PresenceUpdate) => {
    useChatStore.getState().setPresence([update]);
  });

  // Typing events
  socketService.on("typing:start", ({ roomName, userId, userName, profilePicture }) => {
    if (roomName && userId && userName) {
      useChatStore.getState().setUserTyping(roomName, {
        userId,
        userName,
        profilePicture,
      });
    }
  });
  
  socketService.on("typing:stop", ({ roomName, userId }) => {
    if (roomName && userId) {
      useChatStore.getState().setUserStoppedTyping(roomName, userId);
    }
  });
}

// Live presence for a single user, or undefined if we haven't heard about them yet
export const useUserPresence = (userId?: string): UserPresence | undefined =>
  useChatStore((state) => (userId ? state.presence[userId] : undefined));

export default useChatStore;
