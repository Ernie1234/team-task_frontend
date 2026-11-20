import { useEffect } from "react";
import socketService from "@/lib/socket";
import useChatStore from "@/hooks/use-chat-store";
import { getWorkspaceMembers } from "@/lib/api";

/**
 * Keeps the socket connected while the user is signed in and keeps live
 * online/offline presence for the current workspace in the chat store.
 * Mount once, high in the tree (AuthProvider).
 */
const usePresence = (isAuthenticated: boolean, workspaceId?: string) => {
  const isConnected = useChatStore((state) => state.isConnected);

  // Connect once signed in. Logout disconnects (see logout-dialog).
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    }
  }, [isAuthenticated]);

  // (Re)subscribe whenever the workspace changes or the socket reconnects:
  // the server forgets subscriptions when a connection drops.
  useEffect(() => {
    if (!isAuthenticated || !isConnected || !workspaceId) return;

    let cancelled = false;
    const { setPresence, setOnlineUsers } = useChatStore.getState();

    const load = async () => {
      try {
        // Presence comes from the server's live connections, so apply it as soon as it arrives
        const snapshot = await socketService.subscribePresence(workspaceId);
        if (cancelled) return;
        setPresence(snapshot);

        const members = await getWorkspaceMembers(workspaceId);
        if (cancelled) return;
        setOnlineUsers(
          workspaceId,
          members.map((member) => ({
            _id: member._id,
            name: member.name,
            email: member.email,
            role: member.role?.name,
            profilePicture: member.profilePicture ?? undefined,
            isOnline: member.isOnline,
            lastSeen: member.lastSeen ?? undefined,
          }))
        );
      } catch (error) {
        console.error("Failed to load workspace presence:", error);
      }
    };

    load();

    return () => {
      cancelled = true;
      socketService.unsubscribePresence(workspaceId);
    };
  }, [isAuthenticated, isConnected, workspaceId]);
};

export default usePresence;
