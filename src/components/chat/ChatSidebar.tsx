import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Hash,
  MessageCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import useChatStore, { ChatRoom } from "@/hooks/use-chat-store";
import { getWorkspaceMembers } from "@/lib/api";
import useAuth from "@/hooks/api/use-auth";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ChatSidebarProps {
  currentWorkspaceId?: string;
  currentProjectId?: string;
  onRoomSelect: (room: ChatRoom) => void;
  className?: string;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  profilePicture?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentWorkspaceId,
  currentProjectId,
  onRoomSelect,
  className = "",
}) => {
  const { data: user } = useAuth();
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [workspacesCollapsed, setWorkspacesCollapsed] = useState(false);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [directsCollapsed, setDirectsCollapsed] = useState(false);
  const [showNewDMDialog, setShowNewDMDialog] = useState(false);

  const {
    activeRoom,
    workspaceRooms,
    projectRooms,
    directConversations,
    setActiveRoom,
    addRoom,
  } = useChatStore();

  const currentWorkspaceRooms = currentWorkspaceId ? (workspaceRooms[currentWorkspaceId] || []) : [];
  const currentProjectRooms = currentProjectId ? (projectRooms[currentProjectId] || []) : [];

  // Load workspace members for direct messaging
  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      if (!currentWorkspaceId) return;

      try {
        const members = await getWorkspaceMembers(currentWorkspaceId);
        setWorkspaceMembers(members);
      } catch (error) {
        console.error("Failed to fetch workspace members:", error);
      }
    };

    fetchWorkspaceMembers();
  }, [currentWorkspaceId]);

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastMessageTime = (date?: string) => {
    if (!date) return "";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const handleRoomClick = (room: ChatRoom) => {
    setActiveRoom(room);
    onRoomSelect(room);
  };

  const handleStartDirectMessage = async (otherUser: WorkspaceMember) => {
    if (!user?.user?._id) {
      console.error('Current user ID not found');
      return;
    }

    // Create room ID with both user IDs sorted (matching backend format)
    const participants = [user.user._id, otherUser._id].sort();
    const roomId = `direct:${participants.join(':')}`;
    
    console.log('Starting DM with:', {
      currentUser: user.user._id,
      otherUser: otherUser._id,
      participants,
      roomId
    });
    
    // Check if room already exists
    const existingRoom = directConversations.find(r => r.id === roomId);
    if (existingRoom) {
      handleRoomClick(existingRoom);
      setShowNewDMDialog(false);
      return;
    }

    // Create new direct message room
    const newRoom: ChatRoom = {
      id: roomId,
      name: otherUser.name,
      type: "direct",
      otherUser: {
        _id: otherUser._id,
        name: otherUser.name,
        profilePicture: otherUser.profilePicture,
      },
      unreadCount: 0,
      isActive: false,
    };

    addRoom(newRoom);
    handleRoomClick(newRoom);
    setShowNewDMDialog(false);
  };

  const RoomItem: React.FC<{ room: ChatRoom; icon: React.ReactNode }> = ({ room, icon }) => (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start p-3 h-auto group",
        activeRoom?.id === room.id && "bg-muted"
      )}
      onClick={() => handleRoomClick(room)}
    >
      <div className="flex items-center space-x-3 w-full">
        <div className="flex-shrink-0">
          {room.type === "direct" && room.otherUser ? (
            <Avatar className="w-6 h-6">
              <AvatarImage src={room.otherUser.profilePicture} alt={room.otherUser.name} />
              <AvatarFallback className="text-xs">
                {getUserInitials(room.otherUser.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            icon
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm truncate",
              room.unreadCount > 0 && "font-semibold"
            )}>
              {room.type === "workspace" && "#"}
              {room.name}
            </span>
            {room.unreadCount > 0 && (
              <Badge variant="default" className="text-xs h-5 min-w-5 flex items-center justify-center">
                {room.unreadCount > 99 ? "99+" : room.unreadCount}
              </Badge>
            )}
          </div>
          
          {room.lastMessage && (
            <div className="flex items-center justify-between mt-1">
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
    </Button>
  );

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 border-r", className)}>
      {/* Sidebar Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat</h2>
        <p className="text-sm text-muted-foreground">
          {currentWorkspaceId ? "Workspace & Direct Messages" : "All Conversations"}
        </p>
      </div>

      {/* Chat Rooms */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Workspace Channels */}
          {currentWorkspaceId && currentWorkspaceRooms.length > 0 && (
            <Collapsible open={!workspacesCollapsed} onOpenChange={setWorkspacesCollapsed}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-8 text-sm font-medium"
                >
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4" />
                    <span>Workspace Channels</span>
                  </div>
                  {workspacesCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                {currentWorkspaceRooms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    icon={<Hash className="w-4 h-4" />}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Project Channels */}
          {currentProjectId && currentProjectRooms.length > 0 && (
            <>
              <Separator />
              <Collapsible open={!projectsCollapsed} onOpenChange={setProjectsCollapsed}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-8 text-sm font-medium"
                  >
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="w-4 h-4" />
                      <span>Project Channels</span>
                    </div>
                    {projectsCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {currentProjectRooms.map((room) => (
                    <RoomItem
                      key={room.id}
                      room={room}
                      icon={<FolderOpen className="w-4 h-4" />}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Direct Messages */}
          <Separator />
          <Collapsible open={!directsCollapsed} onOpenChange={setDirectsCollapsed}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-8 text-sm font-medium"
              >
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Direct Messages</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Dialog open={showNewDMDialog} onOpenChange={setShowNewDMDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewDMDialog(true);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Start Direct Message</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <ScrollArea className="max-h-64">
                          <div className="space-y-2">
                            {workspaceMembers
                              .filter(member => member._id !== user?.user._id)
                              .map((member) => (
                                <Button
                                  key={member._id}
                                  variant="ghost"
                                  className="w-full justify-start p-3 h-auto"
                                  onClick={() => handleStartDirectMessage(member)}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={member.profilePicture} alt={member.name} />
                                      <AvatarFallback className="text-xs">
                                        {getUserInitials(member.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{member.name}</span>
                                  </div>
                                </Button>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {directsCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {directConversations.map((room) => (
                <RoomItem
                  key={room.id}
                  room={room}
                  icon={<MessageCircle className="w-4 h-4" />}
                />
              ))}
              {directConversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No direct messages yet
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.user?.profilePicture} alt={user?.user.name} />
            <AvatarFallback className="text-xs">
              {user?.user.name ? getUserInitials(user?.user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.user.name}</p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;