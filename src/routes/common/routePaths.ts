export const isAuthRoute = (pathname: string): boolean => {
  return Object.values(AUTH_ROUTES).includes(pathname);
};

export const AUTH_ROUTES = {
  SIGN_IN: "/",
  SIGN_UP: "/sign-up",
  GOOGLE_OAUTH_CALLBACK: "/google/oauth/callback",
  VERIFY_EMAIL: "/verify-email",
};

export const PROTECTED_ROUTES = {
  WORKSPACE: "/workspace/:workspaceId",
  TASKS: "/workspace/:workspaceId/tasks",
  MEMBERS: "/workspace/:workspaceId/members",
  NOTIFICATION: "/workspace/:workspaceId/notifications",
  SETTINGS: "/workspace/:workspaceId/settings",
  CHAT: "/workspace/:workspaceId/chat",
  PROJECT_DETAILS: "/workspace/:workspaceId/project/:projectId",
  PROJECT_CHAT: "/workspace/:workspaceId/project/:projectId/chat",
};

export const BASE_ROUTE = {
  INVITE_URL: "/invite/workspace/:inviteCode/join",
};
