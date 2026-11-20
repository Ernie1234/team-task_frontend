import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import useAuth from "@/hooks/api/use-auth";
import useChatStore from "@/hooks/use-chat-store";
import { useConversations } from "@/hooks/use-conversations";
import { useIsMobile } from "@/hooks/use-mobile";
import { directRoomId } from "@/lib/chat-rooms";
import type { Conversation } from "@/types/chat.type";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import ChatDetails from "./ChatDetails";

interface ChatLayoutProps {
  workspaceId: string;
  projectId?: string;
  className?: string;
}

const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable (private mode etc.): just don't remember
    }
  },
};
const lastRoomKey = (workspaceId: string) => `chat:lastRoom:${workspaceId}`;
const DETAILS_KEY = "chat:detailsOpen";

const useWideScreen = () => {
  const query = "(min-width: 1280px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return wide;
};

/**
 * Full-page, three-panel chat: conversations | conversation | details.
 * The open conversation lives in the URL (?room=… or ?dm=<userId>) so links
 * from elsewhere (dashboard, members) can open a chat directly.
 */
const ChatLayout = ({ workspaceId, projectId, className }: ChatLayoutProps) => {
  const { data: auth } = useAuth();
  const user = auth?.user;
  const myId = user?._id;
  const isMobile = useIsMobile();
  const isWide = useWideScreen();
  const isConnected = useChatStore((s) => s.isConnected);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: conversations, isLoading, isError, refetch } = useConversations(workspaceId);

  // Details panel: open by default on wide screens, remembered either way
  const [detailsPreference, setDetailsPreference] = useState(() => storage.get(DETAILS_KEY) !== "closed");
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const detailsInline = isWide && detailsPreference;
  const toggleDetails = useCallback(() => {
    if (isWide) {
      setDetailsPreference((open) => {
        storage.set(DETAILS_KEY, open ? "closed" : "open");
        return !open;
      });
    } else {
      setDetailsSheetOpen((open) => !open);
    }
  }, [isWide]);

  const roomParam = searchParams.get("room");
  const dmParam = searchParams.get("dm");

  // Which room to show: ?dm → ?room → project route → last opened → #general (desktop)
  const requestedId = useMemo(() => {
    if (dmParam && myId) return directRoomId(myId, dmParam);
    if (roomParam) return roomParam;
    if (projectId) return `project:${projectId}`;
    if (isMobile) return null; // phones start on the list
    return storage.get(lastRoomKey(workspaceId)) ?? `workspace:${workspaceId}`;
  }, [dmParam, roomParam, projectId, isMobile, workspaceId, myId]);

  const active = useMemo(
    () =>
      conversations?.find((c) => c.id === requestedId) ??
      (!isMobile && !dmParam ? conversations?.find((c) => c.type === "workspace") : undefined),
    [conversations, requestedId, isMobile, dmParam]
  );

  // Normalise ?dm=<user> into ?room=<id> once we know the room exists
  useEffect(() => {
    if (dmParam && active) setSearchParams({ room: active.id }, { replace: true });
  }, [dmParam, active, setSearchParams]);

  useEffect(() => {
    if (active) storage.set(lastRoomKey(workspaceId), active.id);
  }, [active, workspaceId]);

  const select = useCallback(
    (conversation: Conversation) => {
      setDetailsSheetOpen(false);
      setSearchParams({ room: conversation.id });
    },
    [setSearchParams]
  );
  const messageUser = useCallback(
    (userId: string) => {
      setDetailsSheetOpen(false);
      setSearchParams({ dm: userId });
    },
    [setSearchParams]
  );
  const back = useCallback(() => setSearchParams({}), [setSearchParams]);

  const me = useMemo(
    () => (user ? { _id: user._id, name: user.name, profilePicture: user.profilePicture } : undefined),
    [user]
  );

  const showList = !isMobile || !active;
  const dmNotFound = !!dmParam && !!conversations && !active;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-background", className)}>
      {!isConnected && (
        <div className="flex items-center justify-center gap-2 border-b bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400" role="status">
          <WifiOff className="h-3.5 w-3.5" />
          Reconnecting… you can keep typing; messages send when you're back online.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {showList && (
          <ChatSidebar
            conversations={conversations ?? []}
            activeId={active?.id}
            onSelect={select}
            isLoading={isLoading}
            myId={myId}
            className={cn(isMobile ? "w-full" : "w-[320px] shrink-0 border-r lg:w-[360px]")}
          />
        )}

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <p>Couldn't load your chats. Check that the server is running.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : active ? (
          <>
            <ChatInterface
              key={active.id}
              conversation={active}
              myId={myId}
              me={me}
              onBack={isMobile ? back : undefined}
              onMessageUser={messageUser}
              detailsOpen={detailsInline || detailsSheetOpen}
              onToggleDetails={toggleDetails}
              className="min-w-0 flex-1"
            />
            {detailsInline && (
              <ChatDetails
                conversation={active}
                myId={myId}
                onMessageUser={messageUser}
                onClose={toggleDetails}
                className="w-[340px] shrink-0 border-l"
              />
            )}
            {!isWide && (
              <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-sm [&>button]:hidden">
                  <SheetTitle className="sr-only">Conversation details</SheetTitle>
                  <ChatDetails
                    conversation={active}
                    myId={myId}
                    onMessageUser={messageUser}
                    onClose={() => setDetailsSheetOpen(false)}
                    className="h-full"
                  />
                </SheetContent>
              </Sheet>
            )}
          </>
        ) : !isMobile ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary-2/15">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              {dmNotFound
                ? "That person isn't in this workspace, so you can't message them here."
                : isLoading
                  ? "Loading your chats…"
                  : "Pick a conversation, or tap someone in Active now."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChatLayout;
