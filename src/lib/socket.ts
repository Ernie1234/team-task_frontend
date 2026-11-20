import { io, Socket } from "socket.io-client";

export type ChatType = "workspace" | "project" | "direct";

export interface MessageAttachment {
  url: string; // "/uploads/chat/..." on the API server; see fileUrl()
  name: string;
  size: number;
  mimeType: string;
}

export interface Message {
  _id: string;
  content: string;
  chatType: ChatType;
  // null if the sender's account was deleted
  sender: {
    _id: string;
    name: string;
    profilePicture?: string;
  } | null;
  workspace?: string;
  project?: string;
  participants?: string[];
  messageType: "text" | "image" | "file" | "system";
  attachments?: MessageAttachment[];
  replyTo?: Pick<Message, "_id" | "content" | "sender" | "attachments" | "isDeleted"> | null;
  isEdited: boolean;
  isDeleted: boolean;
  reactions: Array<{
    // Populated by the server on reaction updates; a plain id otherwise
    user: string | { _id: string; name: string; profilePicture?: string };
    emoji: string;
  }>;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  // Only on this device's optimistic copy, until the server confirms it
  clientId?: string;
  clientStatus?: "sending" | "failed";
  clientError?: string;
  clientProgress?: number;
}

// Every chat event carries the room it belongs to
export interface NewMessageEvent {
  message: Message;
  roomId: string;
  clientId?: string;
}

type AckResponse<T = object> = ({ ok: true } & T) | { ok: false; error?: string };

export interface OnlineUser {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen?: string;
}

// Live presence for one user, as sent by the server
export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface TypingUser {
  userId: string;
  userName: string;
  profilePicture?: string;
}

// Socket events carry different payloads per event name, so listeners accept any payload.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketEventListener = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;

  // Event listeners storage
  private eventListeners: Map<string, SocketEventListener[]> = new Map();

  constructor() {
    // Don't auto-connect - wait for explicit connect() call after authentication
  }

  public connect() {
    if (this.socket) {
      // Reuse the existing socket; socket.io handles reconnection itself.
      // Creating a new one here would leave the old socket running in parallel.
      if (!this.socket.connected && !this.socket.active) {
        this.socket.connect();
      }
      return;
    }

    // Remove /api/v1 from the URL if present for socket connection
    let baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    baseUrl = baseUrl.replace(/\/api(\/v1)?\/?$/, '');
    
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
      reconnectionDelayMax: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", this.socket?.id);
      console.log("📡 Transport:", this.socket?.io.engine.transport.name);
      this.emit("connection:status", { connected: true });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket.IO disconnected:", reason);
      // socket.io reconnects on its own unless the server or client closed the
      // connection deliberately ("io server disconnect" / "io client disconnect")
      this.emit("connection:status", { connected: false, reason });
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔥 Socket.IO connection error:", error);
      console.error("🔥 Error message:", error.message);
      console.error("🔥 Error description:", (error as Error & { description?: unknown }).description);
      this.emit("connection:error", { error: error.message });
      // socket.io keeps retrying network errors; auth errors from the server stop it
      if (error.message.includes('Authentication')) {
        console.error('❌ Authentication required. Please log in.');
      }
    });

    // Chat event handlers
    this.socket.on("message:new", (data: NewMessageEvent) => {
      this.emit("message:new", data);
    });

    this.socket.on("room:read", (data) => {
      this.emit("room:read", data);
    });

    this.socket.on("activity:new", (data) => {
      this.emit("activity:new", data);
    });

    this.socket.on("task:changed", (data) => {
      this.emit("task:changed", data);
    });

    this.socket.on("note:changed", (data) => {
      this.emit("note:changed", data);
    });

    this.socket.on("calendar:changed", (data) => {
      this.emit("calendar:changed", data);
    });

    this.socket.on("event:reminder", (data) => {
      this.emit("event:reminder", data);
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

    // Notification events (sent only to the recipient's own tabs)
    this.socket.on("notification:new", (data) => {
      this.emit("notification:new", data);
    });

    this.socket.on("notification:read", (data) => {
      this.emit("notification:read", data);
    });

    // User presence events
    this.socket.on("presence:update", (data: PresenceUpdate) => {
      this.emit("presence:update", data);
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

  // Event emitter methods
  private emit(event: string, data?: Parameters<SocketEventListener>[0]) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  public on(event: string, callback: SocketEventListener) {
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

  public off(event: string, callback?: SocketEventListener) {
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

  // Close the connection (e.g. on logout). Listeners registered with on()
  // are kept so the app keeps working when connect() is called again.
  public disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.emit("connection:status", { connected: false, reason: "io client disconnect" });
    }
  }

  // Presence: start receiving live updates for a workspace and get everyone's current state
  public async subscribePresence(workspaceId: string): Promise<PresenceUpdate[]> {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    const response: { ok: boolean; error?: string; presence?: PresenceUpdate[] } =
      await this.socket.timeout(5000).emitWithAck("presence:subscribe", { workspaceId });

    if (!response?.ok) {
      throw new Error(response?.error || "Failed to subscribe to presence");
    }
    return response.presence ?? [];
  }

  public unsubscribePresence(workspaceId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("presence:unsubscribe", { workspaceId });
  }

  public reconnect() {
    this.disconnect();
    this.connect();
  }

  // Send an event and wait for the server's answer. Throws with the server's reason.
  private async request<T = object>(event: string, payload: unknown, timeoutMs = 8000): Promise<T> {
    if (!this.socket?.connected) {
      throw new Error("You're offline. Reconnecting…");
    }
    let response: AckResponse<T>;
    try {
      response = await this.socket.timeout(timeoutMs).emitWithAck(event, payload);
    } catch {
      throw new Error("The server didn't respond. Please try again.");
    }
    if (!response?.ok) {
      throw new Error((response as { error?: string })?.error || "Something went wrong");
    }
    return response as T;
  }

  // Channels are socket rooms; DMs arrive on your personal room automatically
  public async joinRoom(
    chatType: ChatType,
    options: { workspace?: string; project?: string; otherUserId?: string }
  ) {
    if (chatType === "direct") return;
    await this.request("room:join", { chatType, ...options });
  }

  public leaveRoom(roomId: string) {
    if (!this.socket?.connected || roomId.startsWith("direct:")) return;
    this.socket.emit("room:leave", { roomName: roomId });
  }

  public async sendMessage(
    chatType: ChatType,
    options: {
      content: string;
      workspace?: string;
      project?: string;
      otherUserId?: string;
      replyTo?: string;
      attachments?: MessageAttachment[];
      clientId?: string;
    }
  ): Promise<NewMessageEvent> {
    return this.request<NewMessageEvent>("message:send", { chatType, ...options });
  }

  public editMessage(messageId: string, content: string) {
    return this.request("message:edit", { messageId, content });
  }

  public deleteMessage(messageId: string) {
    return this.request("message:delete", { messageId });
  }

  public reactToMessage(messageId: string, emoji: string) {
    return this.request("message:react", { messageId, emoji });
  }

  public markRoomRead(roomId: string) {
    return this.request("room:read", { roomId });
  }

  // Typing indicators
  public startTyping(
    chatType: ChatType,
    options: { workspace?: string; project?: string; otherUserId?: string }
  ) {
    if (this.socket?.connected) this.socket.emit("typing:start", { chatType, ...options });
  }

  public stopTyping(
    chatType: ChatType,
    options: { workspace?: string; project?: string; otherUserId?: string }
  ) {
    if (this.socket?.connected) this.socket.emit("typing:stop", { chatType, ...options });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;