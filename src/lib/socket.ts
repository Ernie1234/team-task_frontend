import { io, Socket } from "socket.io-client";

export type ChatType = "workspace" | "project" | "direct";

export interface Message {
  _id: string;
  content: string;
  chatType: ChatType;
  sender: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  workspace?: string;
  project?: string;
  participants?: string[];
  messageType: "text" | "image" | "file" | "system";
  replyTo?: Message;
  isEdited: boolean;
  isDeleted: boolean;
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  createdAt: string;
  updatedAt:string;
  editedAt?: string;
}

export interface OnlineUser {
  _id: string;
  name: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  profilePicture?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private shouldConnect = false;

  // Event listeners storage
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor() {
    // Don't auto-connect - wait for explicit connect() call after authentication
  }

  public connect() {
    if (this.socket?.connected) {
      console.log('✅ Socket already connected');
      return;
    }

    this.shouldConnect = true;

    // Remove /api/v1 from the URL if present for socket connection
    let baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    baseUrl = baseUrl.replace(/\/api\/v1$/, '');
    
    console.log('🔌 Connecting to socket server:', baseUrl);
    console.log('🍪 Cookies:', document.cookie ? 'present' : 'none');
    
    this.socket = io(baseUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      upgrade: true,
      autoConnect: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", this.socket?.id);
      console.log("📡 Transport:", this.socket?.io.engine.transport.name);
      this.reconnectAttempts = 0;
      this.emit("connection:status", { connected: true });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket.IO disconnected:", reason);
      this.emit("connection:status", { connected: false, reason });
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === "io server disconnect") {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.attemptReconnect();
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔥 Socket.IO connection error:", error);
      console.error("🔥 Error message:", error.message);
      console.error("🔥 Error description:", (error as any).description);
      this.emit("connection:error", { error: error.message });
      // Don't auto-reconnect on authentication errors
      if (error.message.includes('Authentication')) {
        console.error('❌ Authentication required. Please log in.');
        return;
      }
      this.attemptReconnect();
    });

    // Chat event handlers
    this.socket.on("message:new", (data) => {
      this.emit("message:new", data.message);
    });

    this.socket.on("message:edited", (data) => {
      this.emit("message:edited", data);
    });

    this.socket.on("message:deleted", (data) => {
      this.emit("message:deleted", data);
    });

    this.socket.on("message:reaction", (data) => {
      this.emit("message:reaction", data);
    });

    // User presence events
    this.socket.on("user:online", (data) => {
      this.emit("user:online", data);
    });

    this.socket.on("user:offline", (data) => {
      this.emit("user:offline", data);
    });

    // Typing events
    this.socket.on("typing:start", (data) => {
      this.emit("typing:start", data);
    });

    this.socket.on("typing:stop", (data) => {
      this.emit("typing:stop", data);
    });

    // Room events
    this.socket.on("room:joined", (data) => {
      this.emit("room:joined", data);
    });

    this.socket.on("room:left", (data) => {
      this.emit("room:left", data);
    });

    // Error handling
    this.socket.on("error", (data) => {
      console.error("Socket.IO server error:", data);
      this.emit("error", data);
    });
  }

  private attemptReconnect() {
    if (!this.shouldConnect) {
      console.log('Socket connection not requested, skipping reconnect');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      this.emit("connection:failed", { reason: "Max attempts reached" });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Event emitter methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: string, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public off(event: string, callback?: (data: any) => void) {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Connection methods
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  public reconnect() {
    this.disconnect();
    this.connect();
  }

  // Chat methods
  public joinRoom(
    chatType: ChatType,
    options: {
      workspace?: string;
      project?: string;
      otherUserId?: string;
    }
  ) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot join room");
      return Promise.reject(new Error("Socket not connected"));
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Join room timeout"));
      }, 5000);

      const onJoined = () => {
        clearTimeout(timeout);
        this.off("room:joined", onJoined);
        this.off("error", onError);
        resolve();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onError = (error: any) => {
        clearTimeout(timeout);
        this.off("room:joined", onJoined);
        this.off("error", onError);
        reject(error);
      };

      this.on("room:joined", onJoined);
      this.on("error", onError);

      this.socket.emit("room:join", {
        chatType,
        ...options,
      });
    });
  }

  public leaveRoom(
    chatType: ChatType,
    options: {
      workspace?: string;
      project?: string;
      otherUserId?: string;
    }
  ) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot leave room");
      return;
    }

    // Construct room name based on chat type
    let roomName = "";
    switch (chatType) {
      case "workspace":
        roomName = `workspace:${options.workspace}`;
        break;
      case "project":
        roomName = `project:${options.project}`;
        break;
      case "direct":
        roomName = `direct:${options.otherUserId}`;
        break;
    }

    if (roomName) {
      this.socket.emit("room:leave", { roomName });
    }
  }

  public sendMessage(
    chatType: ChatType,
    options: {
      content: string;
      workspace?: string;
      project?: string;
      otherUserId?: string;
      replyTo?: string;
      messageType?: "text" | "image" | "file" | "system";
    }
  ) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot send message");
      return Promise.reject(new Error("Socket not connected"));
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Send message timeout"));
      }, 5000);

      const onNewMessage = () => {
        clearTimeout(timeout);
        this.off("message:new", onNewMessage);
        this.off("error", onError);
        resolve();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onError = (error: any) => {
        clearTimeout(timeout);
        this.off("message:new", onNewMessage);
        this.off("error", onError);
        reject(error);
      };

      this.on("message:new", onNewMessage);
      this.on("error", onError);

      this.socket.emit("message:send", {
        chatType,
        ...options,
      });
    });
  }

  public editMessage(messageId: string, content: string) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot edit message");
      return;
    }

    this.socket.emit("message:edit", { messageId, content });
  }

  public deleteMessage(messageId: string) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot delete message");
      return;
    }

    this.socket.emit("message:delete", { messageId });
  }

  public reactToMessage(messageId: string, emoji: string) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot react to message");
      return;
    }

    this.socket.emit("message:react", { messageId, emoji });
  }

  // Typing indicators
  public startTyping(
    chatType: ChatType,
    options: {
      workspace?: string;
      project?: string;
      otherUserId?: string;
    }
  ) {
    if (!this.socket?.connected) return;
    
    this.socket.emit("typing:start", {
      chatType,
      ...options,
    });
  }

  public stopTyping(
    chatType: ChatType,
    options: {
      workspace?: string;
      project?: string;
      otherUserId?: string;
    }
  ) {
    if (!this.socket?.connected) return;
    
    this.socket.emit("typing:stop", {
      chatType,
      ...options,
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;