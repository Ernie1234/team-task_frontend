import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import useChatStore from "@/hooks/use-chat-store";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useAuth from "@/hooks/api/use-auth";

interface ChatWidgetProps {
  className?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ className = "" }) => {
  useAuth();
  const workspaceId = useWorkspaceId();
  const {
    workspaceRooms,
    directConversations,
    onlineUsers,
    isConnected,
  } = useChatStore();

  const currentWorkspaceRooms = workspaceId ? (workspaceRooms[workspaceId] || []) : [];
  const workspaceOnlineUsers = workspaceId ? (onlineUsers[workspaceId] || []) : [];
  const onlineCount = workspaceOnlineUsers.filter(u => u.isOnline).length;

  // Get total unread messages
  const totalUnread = [
    ...currentWorkspaceRooms,
    ...directConversations,
  ].reduce((total, room) => total + room.unreadCount, 0);

  // Get recent conversations with messages
  const recentConversations = [
    ...currentWorkspaceRooms,
    ...directConversations,
  ]
    .filter(room => room.lastMessage)
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastMessageTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Chat Activity</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalUnread > 99 ? "99+" : totalUnread}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{onlineCount} online</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center py-4 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chat disconnected</p>
          </div>
        )}

        {/* Recent Conversations */}
        {isConnected && recentConversations.length > 0 ? (
          <div className="space-y-2">
            {recentConversations.map((room) => (
              <div
                key={room.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {room.type === "direct" && room.otherUser ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={room.otherUser.profilePicture} alt={room.otherUser.name} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(room.otherUser.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {room.type === "workspace" ? `#${room.name}` : room.name}
                    </p>
                    {room.unreadCount > 0 && (
                      <Badge variant="default" className="text-xs h-4 min-w-4">
                        {room.unreadCount > 9 ? "9+" : room.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  {room.lastMessage && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">
                        {room.lastMessage.sender.name}: {room.lastMessage.content}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatLastMessageTime(room.lastMessage.createdAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : isConnected ? (
          <div className="text-center py-4 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent conversations</p>
            <p className="text-xs">Start chatting with your team!</p>
          </div>
        ) : null}

        {/* Open Chat Button */}
        <div className="pt-2 border-t">
          <Button
            asChild
            variant="outline"
            className="w-full justify-between"
          >
            <Link to={`/workspace/${workspaceId}/chat`}>
              <span>Open Full Chat</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatWidget;