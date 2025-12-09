import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import useChatStore, { ChatRoom } from "@/hooks/use-chat-store";
import socketService from "@/lib/socket";
import useAuth from "@/hooks/api/use-auth";

interface ChatLayoutProps {
  workspaceId?: string;
  projectId?: string;
  className?: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  workspaceId,
  projectId,
  className = "",
}) => {
  const { data: user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const {
    activeRoom,
    setActiveRoom,
    addRoom,
    setWorkspaceRooms,
    isConnected: socketConnected,
  } = useChatStore();

  // Monitor socket connection status
  useEffect(() => {
    if (!user) return;

    console.log('💬 Initializing chat for user:', user.user._id);

    // Socket connection handlers
    const handleConnectionStatus = ({ connected }: { connected: boolean }) => {
      console.log('🔌 Socket connection status changed:', connected);
      setIsConnected(connected);
      if (connected) {
        console.log('✅ Chat connected successfully');
      } else {
        console.log('❌ Chat disconnected');
      }
    };

    const handleConnectionError = ({ error }: { error: string }) => {
      console.error('🔥 Socket connection error:', error);
      setIsConnected(false);
    };

    const unsubscribe1 = socketService.on('connection:status', handleConnectionStatus);
    const unsubscribe2 = socketService.on('connection:error', handleConnectionError);
    
    // Check if already connected
    if (socketService.isConnected()) {
      console.log('✅ Socket already connected');
      setIsConnected(true);
    } else {
      // Explicitly connect socket after user is authenticated
      console.log('⏳ Connecting socket...');
      socketService.connect();
    }

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  // Set up workspace chat room when workspace changes
  useEffect(() => {
    if (!workspaceId || !isConnected) return;

    const setupWorkspaceChat = async () => {
      try {
        // Create default workspace room
        const workspaceRoom: ChatRoom = {
          id: `workspace:${workspaceId}`,
          name: "General",
          type: "workspace",
          workspace: workspaceId,
          unreadCount: 0,
          isActive: false,
        };

        // Add to store and set as default rooms
        setWorkspaceRooms(workspaceId, [workspaceRoom]);
        
        // Auto-select workspace room if no room is selected
        if (!activeRoom) {
          setActiveRoom(workspaceRoom);
          setSelectedRoom(workspaceRoom);
        }

        // Join the workspace room
        await socketService.joinRoom("workspace", { workspace: workspaceId });
      } catch (error) {
        console.error("Failed to setup workspace chat:", error);
      }
    };

    setupWorkspaceChat();
  }, [workspaceId, isConnected, activeRoom, setActiveRoom, setWorkspaceRooms]);

  // Set up project chat room when project changes
  useEffect(() => {
    if (!projectId || !isConnected) return;

    const setupProjectChat = async () => {
      try {
        // Create default project room
        const projectRoom: ChatRoom = {
          id: `project:${projectId}`,
          name: "Project Discussion",
          type: "project",
          project: projectId,
          unreadCount: 0,
          isActive: false,
        };

        // Add to store
        addRoom(projectRoom);

        // Join the project room
        await socketService.joinRoom("project", { project: projectId });
      } catch (error) {
        console.error("Failed to setup project chat:", error);
      }
    };

    setupProjectChat();
  }, [projectId, isConnected, addRoom]);

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
    setActiveRoom(room);
  };

  if (!user) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access chat</p>
        </div>
      </Card>
    );
  }

  // Don't block UI while connecting - allow REST API fallback
  if (!socketConnected) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to chat...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`flex h-full overflow-hidden ${className}`}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Chat Sidebar */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <ChatSidebar
            currentWorkspaceId={workspaceId}
            currentProjectId={projectId}
            onRoomSelect={handleRoomSelect}
            className="h-full"
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Chat Interface */}
        <ResizablePanel defaultSize={75} minSize={60}>
          {selectedRoom || activeRoom ? (
            <ChatInterface
              room={selectedRoom || activeRoom!}
              workspaceId={workspaceId}
              projectId={projectId}
              className="h-full border-none"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Welcome to Chat</h3>
                <p className="text-muted-foreground">
                  Select a conversation from the sidebar to start chatting
                </p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
};

export default ChatLayout;