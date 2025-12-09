import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import useChatStore, { ChatRoom } from "@/hooks/use-chat-store";
import socketService from "@/lib/socket";
import { getChatMessages } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import OnlineUsers from "./OnlineUsers";
import useAuth from "@/hooks/api/use-auth";

interface ChatInterfaceProps {
  room: ChatRoom;
  workspaceId?: string;
  projectId?: string;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  room, 
  workspaceId, 
  projectId, 
  className = "" 
}) => {
  const { data: user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const {
    messages,
    loadingMessages,
    sendingMessage,
    typingUsers,
    hasMoreMessages,
    isConnected,
    setActiveRoom,
    clearActiveRoom,
    setMessages,
    prependMessages,
    setLoadingMessages,
  } = useChatStore();

  const roomMessages = messages[room.id] || [];
  const roomTypingUsers = typingUsers[room.id] || [];
  const canLoadMore = hasMoreMessages[room.id] || false;

  // Set active room on mount and cleanup on unmount
  useEffect(() => {
    setActiveRoom(room);
    
    return () => {
      clearActiveRoom();
    };
  }, [room.id, setActiveRoom, clearActiveRoom]);

  // Join socket room when component mounts
  useEffect(() => {
    const joinRoom = async () => {
      try {
        await socketService.joinRoom(room.type, {
          workspace: room.workspace,
          project: room.project,
          otherUserId: room.otherUser?._id,
        });
      } catch (error) {
        console.error("Failed to join room:", error);
      }
    };

    joinRoom();

    return () => {
      // Leave room on cleanup
      socketService.leaveRoom(room.type, {
        workspace: room.workspace,
        project: room.project,
        otherUserId: room.otherUser?._id,
      });
    };
  }, [room.id, room.type, room.workspace, room.project, room.otherUser?._id]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      if (roomMessages.length > 0) return; // Already loaded

      setLoadingMessages(true);
      try {
        const response = await getChatMessages(room.type, {
          workspace: room.workspace,
          project: room.project,
          otherUserId: room.otherUser?._id,
          limit: 50,
        });

        setMessages(room.id, response.messages, response.hasMore);
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [room.id, roomMessages.length, setLoadingMessages, setMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    };

    // Scroll to bottom for new messages
    if (roomMessages.length > 0) {
      scrollToBottom();
    }
  }, [roomMessages.length]);

  // Load more messages when scrolling to top
  const handleLoadMore = async () => {
    if (isLoadingMore || !canLoadMore) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = roomMessages[0];
      const response = await getChatMessages(room.type, {
        workspace: room.workspace,
        project: room.project,
        otherUserId: room.otherUser?._id,
        before: oldestMessage?._id,
        limit: 50,
      });

      prependMessages(room.id, response.messages, response.hasMore);
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    if (target.scrollTop === 0 && canLoadMore && !isLoadingMore) {
      handleLoadMore();
    }
  };

  const getRoomTitle = () => {
    switch (room.type) {
      case "workspace":
        return `# ${room.name}`;
      case "project":
        return `📁 ${room.name}`;
      case "direct":
        return room.otherUser?.name || "Direct Message";
      default:
        return room.name;
    }
  };

  const getRoomDescription = () => {
    switch (room.type) {
      case "workspace":
        return "Workspace chat";
      case "project":
        return "Project discussion";
      case "direct":
        return "Direct message";
      default:
        return "";
    }
  };

  if (!user) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <p className="text-muted-foreground">Please log in to access chat</p>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className="text-lg font-semibold">{getRoomTitle()}</h3>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">{getRoomDescription()}</p>
              {/* Connection status indicator */}
              {!isConnected && (
                <span className="flex items-center text-xs text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-600 mr-1 animate-pulse"></span>
                  Offline mode
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Online Users for workspace/project chats */}
        {(room.type === "workspace" || room.type === "project") && workspaceId && (
          <OnlineUsers workspaceId={workspaceId} />
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="flex-1 px-4"
          onScrollCapture={handleScroll}
        >
          <div className="py-4 space-y-4">
            {isLoadingMore && (
              <div className="text-center py-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading more messages...</span>
              </div>
            )}

            {loadingMessages && roomMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
              </div>
            ) : roomMessages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              roomMessages.map((message, index) => {
                const prevMessage = index > 0 ? roomMessages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.sender._id !== message.sender._id ||
                  (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 300000; // 5 minutes

                return (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    showAvatar={showAvatar}
                    isOwnMessage={message.sender._id === user.user._id}
                    roomId={room.id}
                  />
                );
              })
            )}

            {/* Typing Indicator */}
            {roomTypingUsers.length > 0 && (
              <TypingIndicator users={roomTypingUsers} />
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Message Input */}
        <div className="p-4">
          <MessageInput
            room={room}
            disabled={sendingMessage}
          />
        </div>
      </div>
    </Card>
  );
};

export default ChatInterface;