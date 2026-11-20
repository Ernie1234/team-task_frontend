import GoogleOAuthFailure from "@/page/auth/GoogleOAuthFailure";
import SignIn from "@/page/auth/Sign-in";
import SignUp from "@/page/auth/Sign-up";
import WorkspaceDashboard from "@/page/workspace/Dashboard";
import Members from "@/page/workspace/Members";
import ProjectDetails from "@/page/workspace/ProjectDetails";
import Settings from "@/page/workspace/Settings";
import Tasks from "@/page/workspace/Tasks";
import { AUTH_ROUTES, BASE_ROUTE, PROTECTED_ROUTES } from "./routePaths";
import InviteUser from "@/page/invite/InviteUser";
import NotificationPage from "@/page/workspace/Notification";
import WorkspaceChat from "@/page/workspace/Chat";
import VerifyEmail from "@/components/auth/verify-email";
import { lazy, Suspense } from "react";
import CalendarPage from "@/page/workspace/Calendar";
import { Loader2 } from "lucide-react";

// Notes bring in the block editor: load them only when opened
const Notes = lazy(() => import("@/page/workspace/Notes"));
const notesPage = (
  <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
    <Notes />
  </Suspense>
);

export const authenticationRoutePaths = [
  { path: AUTH_ROUTES.SIGN_IN, element: <SignIn /> },
  { path: AUTH_ROUTES.SIGN_UP, element: <SignUp /> },
  { path: AUTH_ROUTES.GOOGLE_OAUTH_CALLBACK, element: <GoogleOAuthFailure /> },
  { path: AUTH_ROUTES.VERIFY_EMAIL, element: <VerifyEmail /> },
];

export const protectedRoutePaths = [
  { path: PROTECTED_ROUTES.WORKSPACE, element: <WorkspaceDashboard /> },
  { path: PROTECTED_ROUTES.TASKS, element: <Tasks /> },
  { path: PROTECTED_ROUTES.MEMBERS, element: <Members /> },
  { path: PROTECTED_ROUTES.NOTIFICATION, element: <NotificationPage /> },
  { path: PROTECTED_ROUTES.SETTINGS, element: <Settings /> },
  { path: PROTECTED_ROUTES.CHAT, element: <WorkspaceChat /> },
  { path: PROTECTED_ROUTES.NOTES, element: notesPage },
  { path: PROTECTED_ROUTES.CALENDAR, element: <CalendarPage /> },
  { path: PROTECTED_ROUTES.NOTE, element: notesPage },
  { path: PROTECTED_ROUTES.PROJECT_DETAILS, element: <ProjectDetails /> },
  { path: PROTECTED_ROUTES.PROJECT_CHAT, element: <WorkspaceChat /> },
];

export const baseRoutePaths = [
  { path: BASE_ROUTE.INVITE_URL, element: <InviteUser /> },
];
