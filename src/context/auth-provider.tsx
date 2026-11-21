/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useRef } from "react";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useAuth from "@/hooks/api/use-auth";
import { IWorkspace, UserType } from "@/types/api.type";
import useGetWorkspaceQuery from "@/hooks/api/use-get-workspace";
import { useNavigate } from "react-router-dom";
import usePermissions from "@/hooks/use-permissions";
import { PermissionType } from "@/constant";
import usePresence from "@/hooks/use-presence";
import useNotificationSocket from "@/hooks/use-notification-socket";
import useChatSocket from "@/hooks/use-chat-socket";
import { useTaskSocket } from "@/hooks/api/use-tasks";
import { useAppearanceSync } from "@/hooks/use-appearance";
import { useTimeZoneSync } from "@/hooks/api/use-email-prefs";
import { setErrorReportingUser } from "@/lib/sentry";
import { useCalendarSocket } from "@/hooks/api/use-calendar";

// Define the context shape
type AuthContextType = {
  user?: UserType;
  workspace?: IWorkspace;
  hasPermission: (permission: PermissionType) => boolean;
  error: any;
  isLoading: boolean;
  isFetching: boolean;
  workspaceLoading: boolean;
  refetchAuth: () => void;
  refetchWorkspace: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();

  const {
    data: authData,
    error: authError,
    isLoading,
    isFetching,
    refetch: refetchAuth,
  } = useAuth();
  const user = authData?.user;

  const {
    data: workspaceData,
    isLoading: workspaceLoading,
    error: workspaceError,
    refetch: refetchWorkspace,
  } = useGetWorkspaceQuery(workspaceId);

  const workspace = workspaceData?.workspaceWithMembers;

  // Live socket connection + online/offline presence for this workspace
  usePresence(!!user, workspace ? workspaceId : undefined);
  // Live notifications: toasts + instant badge/bell/page updates
  useNotificationSocket();
  // Live chat previews / unread counts for this workspace
  useChatSocket(user?._id, workspace ? workspaceId : undefined);
  // Tasks changed by teammates show up without a refresh
  useTaskSocket();
  // Theme, font and text size follow the user across devices
  useAppearanceSync(user?._id, user?.appearance);
  // Daily summary emails arrive in the morning of the user's own time zone
  useTimeZoneSync(user);
  // Error reports say which account hit them (id only)
  useEffect(() => setErrorReportingUser(user?._id ?? null), [user?._id]);
  // Calendar reminders (toast + desktop alert) and live calendar updates
  useCalendarSocket(workspace ? workspaceId : undefined);

  // Not a member of the workspace in the URL: go to one the user does belong to.
  // Navigating to "/" here would bounce straight back to the same workspace
  // (it redirects to currentWorkspace) and loop forever.
  const redirectedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (workspaceError?.errorCode !== "ACCESS_UNAUTHORIZED") return;
    if (redirectedFrom.current === workspaceId) return;
    redirectedFrom.current = workspaceId;

    let cancelled = false;
    (async () => {
      // The server repairs currentWorkspace when the user isn't a member of it
      const { data } = await refetchAuth();
      if (cancelled) return;
      const fallbackId = data?.user?.currentWorkspace?._id;
      if (fallbackId && fallbackId !== workspaceId) {
        navigate(`/workspace/${fallbackId}`, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, refetchAuth, workspaceError, workspaceId]);

  const permissions = usePermissions(user, workspace);

  const hasPermission = (permission: PermissionType): boolean => {
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        hasPermission,
        error: authError || workspaceError,
        isLoading,
        isFetching,
        workspaceLoading,
        refetchAuth,
        refetchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useCurrentUserContext must be used within a AuthProvider");
  }
  return context;
};
