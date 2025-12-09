import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, MessageCircle } from "lucide-react";
import useChatStore from "@/hooks/use-chat-store";
import { getOnlineUsers } from "@/lib/api";
import useAuth from "@/hooks/api/use-auth";
import socketService from "@/lib/socket";

interface OnlineUsersProps {
  workspaceId: string;
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ workspaceId }) => {
  const { data: user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { onlineUsers, setOnlineUsers } = useChatStore();
  
  const workspaceOnlineUsers = onlineUsers[workspaceId] || [];

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      if (workspaceOnlineUsers.length > 0) return; // Already loaded
      
      setLoading(true);
      try {
        const users = await getOnlineUsers(workspaceId);
        setOnlineUsers(workspaceId, users);
      } catch (error) {
        console.error("Failed to fetch online users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlineUsers();
  }, [workspaceId, workspaceOnlineUsers.length, setOnlineUsers]);

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStartDirectMessage = async (otherUserId: string, otherUserName: string) => {
    try {
      // Create/join direct message room
      await socketService.joinRoom("direct", { otherUserId });
      
      // Add room to store if not exists
      const roomId = `direct:${otherUserId}`;
      const existingRoom = useChatStore.getState().directConversations.find(r => r.id === roomId);
      
      if (!existingRoom) {
        const newRoom = {
          id: roomId,
          name: otherUserName,
          type: "direct" as const,
          otherUser: {
            _id: otherUserId,
            name: otherUserName,
            profilePicture: workspaceOnlineUsers.find(u => u._id === otherUserId)?.profilePicture,
          },
          unreadCount: 0,
          isActive: false,
        };
        
        useChatStore.getState().addRoom(newRoom);
        useChatStore.getState().setActiveRoom(newRoom);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to start direct message:", error);
    }
  };

  const onlineCount = workspaceOnlineUsers.filter(u => u.isOnline).length;
  const totalCount = workspaceOnlineUsers.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <Badge variant="secondary" className="text-xs">
            {onlineCount}/{totalCount}
          </Badge>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Members</h4>
            <Badge variant="outline" className="text-xs">
              {onlineCount} online
            </Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {workspaceOnlineUsers
                  .sort((a, b) => {
                    // Sort by online status first, then by name
                    if (a.isOnline && !b.isOnline) return -1;
                    if (!a.isOnline && b.isOnline) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage 
                              src={member.profilePicture} 
                              alt={member.name} 
                            />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Online status indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                            member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name}
                            {member._id === user?._id && " (You)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.isOnline ? (
                              member.lastSeen ? "Online" : "Active now"
                            ) : (
                              member.lastSeen ? (
                                `Last seen ${new Date(member.lastSeen).toLocaleDateString()}`
                              ) : (
                                "Offline"
                              )
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Start DM button */}
                      {member._id !== user?._id && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStartDirectMessage(member._id, member.name)}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Start direct message
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ))}

                {workspaceOnlineUsers.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members found
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default OnlineUsers;