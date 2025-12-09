import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import socketService, { Message, OnlineUser, TypingUser, ChatType } from "@/lib/socket";

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

interface TypingState {
  [roomId: string]: TypingUser[];
}

interface ChatState {
  // Connection state
  isConnected: boolean;
  connectionError?: string;
  
  // Current chat context
  activeRoom?: ChatRoom;
  
  // Messages
  messages: { [roomId: string]: Message[] };
  
  // Users
  onlineUsers: { [workspaceId: string]: OnlineUser[] };
  
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
  addMessage: (roomId: string, message: Message) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  setMessages: (roomId: string, messages: Message[], hasMore?: boolean) => void;
  prependMessages: (roomId: string, messages: Message[], hasMore?: boolean) => void;
  
  // User actions
  setOnlineUsers: (workspaceId: string, users: OnlineUser[]) => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => void;
  
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
    case "direct":
      // Direct message rooms need both user IDs sorted
      if (!otherUserId || !currentUserId) {
        throw new Error('Both user IDs required for direct messages');
      }
      const participants = [currentUserId, otherUserId].sort();
      return `direct:${participants.join(':')}`;
    default:
      throw new Error(`Invalid chat type: ${type}`);
  }
};

const useChatStore = create<ChatState>()(subscribeWithSelector((set, get) => ({
  // Initial state
  isConnected: false,
  messages: {},
  onlineUsers: {},
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
  addMessage: (roomId, message) => {
    set((state) => {
      const roomMessages = state.messages[roomId] || [];
      const updatedMessages = [...roomMessages, message];
      
      // Also increment unread count if room is not active
      const shouldIncrementUnread = state.activeRoom?.id !== roomId;
      
      return {
        messages: {
          ...state.messages,
          [roomId]: updatedMessages,
        },
        // Update room's last message and unread count
        workspaceRooms: Object.fromEntries(
          Object.entries(state.workspaceRooms).map(([wId, rooms]) => [
            wId,
            rooms.map(room => 
              room.id === roomId 
                ? { 
                    ...room, 
                    lastMessage: message, 
                    unreadCount: shouldIncrementUnread ? room.unreadCount + 1 : room.unreadCount 
                  }
                : room
            )
          ])
        ),
        directConversations: state.directConversations.map(room => 
          room.id === roomId 
            ? { 
                ...room, 
                lastMessage: message, 
                unreadCount: shouldIncrementUnread ? room.unreadCount + 1 : room.unreadCount 
              }
            : room
        ),
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
      content: "This message was deleted" 
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
        [workspaceId]: users,
      },
    }));
  },
  
  updateUserOnlineStatus: (userId, isOnline) => {
    set((state) => {
      const updatedOnlineUsers = { ...state.onlineUsers };
      
      Object.keys(updatedOnlineUsers).forEach(workspaceId => {
        updatedOnlineUsers[workspaceId] = updatedOnlineUsers[workspaceId].map(user => 
          user._id === userId ? { ...user, isOnline } : user
        );
      });
      
      return { onlineUsers: updatedOnlineUsers };
    });
  },
  
  // Typing actions
  setUserTyping: (roomId, user) => {
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
  
  // Message events
  socketService.on("message:new", (message: Message) => {
    let roomId: string;
    
    if (message.chatType === "direct" && message.participants) {
      // For direct messages, use the participants array to construct room ID
      const sortedParticipants = [...message.participants].sort();
      roomId = `direct:${sortedParticipants.join(':')}`;
    } else {
      roomId = useChatStore.getState().getRoomId(
        message.chatType,
        message.workspace,
        message.project
      );
    }
    
    useChatStore.getState().addMessage(roomId, message);
  });
  
  // User presence events
  socketService.on("user:online", ({ userId }) => {
    useChatStore.getState().updateUserOnlineStatus(userId, true);
  });
  
  socketService.on("user:offline", ({ userId }) => {
    useChatStore.getState().updateUserOnlineStatus(userId, false);
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

export default useChatStore;