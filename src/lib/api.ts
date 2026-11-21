import API from "./axios-client";
import type { Appearance } from "./appearance";
import type { CalendarConnectionType, CalendarEventType, EventPayloadType, NoteSummaryType, NoteType, NoteVisibility, UpdateNotePayloadType } from "@/types/api.type";
import { baseURL } from "./base-url";
import {
  AllMembersInWorkspaceResponseType,
  AllProjectPayloadType,
  AllProjectResponseType,
  AllTaskPayloadType,
  AllTaskResponseType,
  AnalyticsResponseType,
  ChangeWorkspaceMemberRoleType,
  CreateProjectPayloadType,
  CreateTaskPayloadType,
  EditTaskPayloadType,
  CreateWorkspaceResponseType,
  EditProjectPayloadType,
  ProjectByIdPayloadType,
  ProjectResponseType,
  RecentActivitiesByWorkspaceIdPayloadType,
  RecentActivitiesByWorkspaceIdResponseType,
  WorkspaceNotificationsResponseType,
  TaskDetailResponseType,
  DashboardType,
} from "../types/api.type";
import {
  AllWorkspaceResponseType,
  CreateWorkspaceType,
  CurrentUserResponseType,
  LoginResponseType,
  loginType,
  registerType,
  WorkspaceByIdResponseType,
  EditWorkspaceType,
} from "@/types/api.type";
import type { Message, OnlineUser } from "./socket";
import type { Conversation, SharedAttachment, UploadedAttachment } from "@/types/chat.type";

//******** */ CHAT TYPES ****************
// ******************************************

export type ChatMemberType = Omit<OnlineUser, "role"> & {
  role: { name: string; permissions?: string[] };
  joinedAt?: string;
};

export type DirectConversationType = {
  conversationId: OnlineUser[];
  otherUser?: OnlineUser;
  lastMessage: Message;
  unreadCount: number;
};

/* Sign-in is handled by Better Auth on the API (/auth/*). Sessions last 30 days
   and renew while you use the app, so people stay signed in. */

export const loginMutationFn = async (data: loginType): Promise<LoginResponseType> => {
  const response = await API.post("/auth/sign-in/email", { ...data, rememberMe: true });
  return response.data;
};

export const registerMutationFn = async (data: registerType) =>
  await API.post("/auth/sign-up/email", data);

/** Checks the 6-digit code; on success the API signs the user in */
export const verifyEmailMutationFn = async ({ email, otp }: { email: string; otp: string }) =>
  await API.post("/auth/email-otp/verify-email", { email, otp });

export const resendVerificationCodeMutationFn = async (email: string) =>
  await API.post("/auth/email-otp/send-verification-otp", { email, type: "email-verification" });

export const requestPasswordResetMutationFn = async (email: string) =>
  await API.post("/auth/email-otp/request-password-reset", { email });

export const resetPasswordMutationFn = async (data: { email: string; otp: string; password: string }) =>
  await API.post("/auth/email-otp/reset-password", data);

/** Starts Google sign-in and returns the Google page to send the browser to */
export const googleSignInUrlFn = async (returnUrl?: string | null): Promise<string> => {
  const origin = window.location.origin;
  const response = await API.post("/auth/sign-in/social", {
    provider: "google",
    callbackURL: `${origin}${returnUrl ? decodeURIComponent(returnUrl) : "/"}`,
    errorCallbackURL: `${origin}/google/oauth/callback?status=failure`,
  });
  return response.data.url;
};

export const logoutMutationFn = async () => await API.post("/auth/sign-out", {});

export const saveAppearanceMutationFn = async (appearance: Appearance) => {
  const response = await API.put(`/user/appearance`, appearance);
  return response.data as { appearance: Appearance };
};

/** Records that the guided tour was finished or skipped */
export const updateTourMutationFn = async (status: "completed" | "skipped") => {
  const response = await API.patch(`/user/tour`, { status });
  return response.data as { tour: NonNullable<import("@/types/api.type").UserType["tour"]> };
};

export const getCurrentUserQueryFn =
  async (): Promise<CurrentUserResponseType> => {
    const response = await API.get(`/user/current`);
    return response.data;
  };

//********* WORKSPACE ****************
//************* */

export const createWorkspaceMutationFn = async (
  data: CreateWorkspaceType
): Promise<CreateWorkspaceResponseType> => {
  const response = await API.post(`/workspace/create/new`, data);
  return response.data;
};

export const editWorkspaceMutationFn = async ({
  workspaceId,
  data,
}: EditWorkspaceType) => {
  const response = await API.put(`/workspace/update/${workspaceId}`, data);
  return response.data;
};

export const getAllWorkspacesUserIsMemberQueryFn =
  async (): Promise<AllWorkspaceResponseType> => {
    const response = await API.get(`/workspace/all`);
    return response.data;
  };

export const getWorkspaceByIdQueryFn = async (
  workspaceId: string
): Promise<WorkspaceByIdResponseType> => {
  const response = await API.get(`/workspace/${workspaceId}`);
  return response.data;
};

export const getMembersInWorkspaceQueryFn = async (
  workspaceId: string
): Promise<AllMembersInWorkspaceResponseType> => {
  const response = await API.get(`/workspace/members/${workspaceId}`);
  return response.data;
};

export const getWorkspaceAnalyticsQueryFn = async (
  workspaceId: string
): Promise<AnalyticsResponseType> => {
  const response = await API.get(`/workspace/analytics/${workspaceId}`);
  return response.data;
};

export const changeWorkspaceMemberRoleMutationFn = async ({
  workspaceId,
  data,
}: ChangeWorkspaceMemberRoleType) => {
  const response = await API.put(
    `/workspace/change/member/role/${workspaceId}`,
    data
  );
  return response.data;
};

export const deleteWorkspaceMutationFn = async (
  workspaceId: string
): Promise<{
  message: string;
  currentWorkspace: string;
}> => {
  const response = await API.delete(`/workspace/delete/${workspaceId}`);
  return response.data;
};

//*******MEMBER ****************

export const invitedUserJoinWorkspaceMutationFn = async (
  iniviteCode: string
): Promise<{
  message: string;
  workspaceId: string;
}> => {
  const response = await API.post(`/members/workspace/${iniviteCode}/join`);
  return response.data;
};

export const inviteMemberByEmailMutationFn = async (
  { email }: { email: string },
  workspaceId: string
): Promise<{
  message: string;
  status: boolean;
}> => {
  const response = await API.post(`/workspace/invite/member/${workspaceId}`, {
    email,
  });
  return response.data;
};

//********* */
//********* PROJECTS
export const createProjectMutationFn = async ({
  workspaceId,
  data,
}: CreateProjectPayloadType): Promise<ProjectResponseType> => {
  const response = await API.post(
    `/projects/workspace/${workspaceId}/create-project`,
    data
  );
  return response.data;
};

export const editProjectMutationFn = async ({
  projectId,
  workspaceId,
  data,
}: EditProjectPayloadType): Promise<ProjectResponseType> => {
  const response = await API.put(
    `/projects/workspace/${workspaceId}/all-projects/${projectId}/update`,
    data
  );
  return response.data;
};

export const getProjectsInWorkspaceQueryFn = async ({
  workspaceId,
  pageSize = 10,
  pageNumber = 1,
}: AllProjectPayloadType): Promise<AllProjectResponseType> => {
  const response = await API.get(
    `/projects/workspace/${workspaceId}/all-projects?pageSize=${pageSize}&pageNumber=${pageNumber}`
  );
  return response.data.data;
};

export const getProjectByIdQueryFn = async ({
  workspaceId,
  projectId,
}: ProjectByIdPayloadType): Promise<ProjectResponseType> => {
  const response = await API.get(
    `/projects/workspace/${workspaceId}/all-projects/${projectId}`
  );
  return response.data;
};

export const getProjectAnalyticsQueryFn = async ({
  workspaceId,
  projectId,
}: ProjectByIdPayloadType): Promise<AnalyticsResponseType> => {
  const response = await API.get(
    `/projects/workspace/${workspaceId}/all-projects/${projectId}/analytics`
  );
  return response.data;
};

export const deleteProjectMutationFn = async ({
  workspaceId,
  projectId,
}: ProjectByIdPayloadType): Promise<{
  message: string;
}> => {
  const response = await API.delete(
    `/project/workspace/${workspaceId}/all-projects/${projectId}/delete`
  );
  return response.data;
};

//*******RECENT ACTIVITIES ********************************
//************************* */
export const getwWorkspaceRecentActivitesQueryFn = async ({
  workspaceId,
  page = 1,
  limit = 10,
}: RecentActivitiesByWorkspaceIdPayloadType): Promise<RecentActivitiesByWorkspaceIdResponseType> => {
  const response = await API.get(`/activities/workspace/${workspaceId}`, {
    params: { page, limit },
  });
  return response.data;
};

//*******TASKS ********************************
//************************* */

export const createTaskMutationFn = async ({
  workspaceId,
  projectId,
  data,
}: CreateTaskPayloadType) => {
  const response = await API.post(
    `/tasks/workspace/${workspaceId}/projects/${projectId}/tasks`,
    data
  );
  return response.data;
};

export const editTaskMutationFn = async ({
  taskId,
  projectId,
  workspaceId,
  data,
}: EditTaskPayloadType): Promise<{ message: string }> => {
  const response = await API.put(
    `/tasks/workspace/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    data
  );
  return response.data;
};

export const getAllTasksQueryFn = async ({
  workspaceId,
  keyword,
  projectId,
  assignedTo,
  priority,
  status,
  dueDate,
  pageNumber,
  pageSize,
  parentTask,
  sortBy,
  sortOrder,
}: AllTaskPayloadType): Promise<AllTaskResponseType> => {
  const baseUrl = `/tasks/workspace/${workspaceId}/projects/${projectId || "all"}/tasks`;

  const queryParams = new URLSearchParams();
  if (keyword) queryParams.append("keyword", keyword);
  if (projectId) queryParams.append("projectId", projectId);
  if (assignedTo) queryParams.append("assignedTo", assignedTo);
  if (priority) queryParams.append("priority", priority);
  if (status) queryParams.append("status", status);
  if (dueDate) queryParams.append("dueDate", dueDate);
  if (pageNumber) queryParams.append("pageNumber", pageNumber?.toString());
  if (pageSize) queryParams.append("pageSize", pageSize?.toString());
  if (parentTask) queryParams.append("parentTask", parentTask);
  if (sortBy) queryParams.append("sortBy", sortBy);
  if (sortOrder) queryParams.append("sortOrder", sortOrder);

  const url = queryParams.toString() ? `${baseUrl}?${queryParams}` : baseUrl;
  const response = await API.get(url);
  return response.data;
};

export const getWorkspaceDashboardQueryFn = async (
  workspaceId: string
): Promise<{ dashboard: DashboardType }> => {
  const response = await API.get(`/workspace/dashboard/${workspaceId}`);
  return response.data;
};

export const getTaskByIdQueryFn = async ({
  workspaceId,
  projectId,
  taskId,
}: {
  workspaceId: string;
  projectId: string;
  taskId: string;
}): Promise<TaskDetailResponseType> => {
  const response = await API.get(`/tasks/workspace/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
  return response.data;
};

export const deleteTaskMutationFn = async ({
  workspaceId,
  projectId,
  taskId,
}: {
  workspaceId: string;
  projectId: string | undefined;
  taskId: string;
}): Promise<{
  message: string;
}> => {
  const response = await API.delete(
    `/tasks/workspace/${workspaceId}/projects/${projectId}/tasks/${taskId}`
  );
  return response.data;
};

//*******NOTIFICATIONS ********************************
//************************* */

export const getWorkspaceNotificationsQueryFn = async (
  workspaceId: string
): Promise<WorkspaceNotificationsResponseType> => {
  const response = await API.get(`/notifications/workspace/${workspaceId}`);
  return response.data;
};

export const markNotificationsAsRead = async (
  notificationIds: string[]
): Promise<void> => {
  const response = await API.patch(`/notifications/mark-as-read`, {
    notificationIds,
  });
  return response.data;
};

export const markAllNotificationsAsRead = async (
  workspaceId: string
): Promise<void> => {
  const response = await API.patch(
    `/notifications/workspace/${workspaceId}/mark-all-read`
  );
  return response.data;
};

//*******CHAT ********************************
//************************* */

// Workspace chat
export const getWorkspaceMessagesQueryFn = async ({
  workspaceId,
  limit,
  skip,
  before,
}: {
  workspaceId: string;
  limit?: number;
  skip?: number;
  before?: string;
}): Promise<{
  status: boolean;
  message: string;
  messages: Message[];
  pagination: { hasMore: boolean; total: number };
}> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (skip) params.append("skip", skip.toString());
  if (before) params.append("before", before);
  
  const queryString = params.toString();
  const url = `/chat/workspace/${workspaceId}/messages${queryString ? `?${queryString}` : ""}`;
  
  const response = await API.get(url);
  return response.data;
};

// Project chat
export const getProjectMessagesQueryFn = async ({
  projectId,
  limit,
  skip,
  before,
}: {
  projectId: string;
  limit?: number;
  skip?: number;
  before?: string;
}): Promise<{
  status: boolean;
  message: string;
  messages: Message[];
  pagination: { hasMore: boolean; total: number };
}> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (skip) params.append("skip", skip.toString());
  if (before) params.append("before", before);
  
  const queryString = params.toString();
  const url = `/chat/project/${projectId}/messages${queryString ? `?${queryString}` : ""}`;
  
  const response = await API.get(url);
  return response.data;
};

// Direct messages
export const getDirectMessagesQueryFn = async ({
  otherUserId,
  limit,
  skip,
  before,
}: {
  otherUserId: string;
  limit?: number;
  skip?: number;
  before?: string;
}): Promise<{
  status: boolean;
  message: string;
  messages: Message[];
  pagination: { hasMore: boolean; total: number };
}> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (skip) params.append("skip", skip.toString());
  if (before) params.append("before", before);
  
  const queryString = params.toString();
  const url = `/chat/direct/${otherUserId}/messages${queryString ? `?${queryString}` : ""}`;
  
  const response = await API.get(url);
  return response.data;
};

// Get online users
export const getOnlineUsersQueryFn = async (workspaceId: string): Promise<{
  status: boolean;
  message: string;
  onlineUsers: OnlineUser[];
}> => {
  const response = await API.get(`/chat/workspace/${workspaceId}/online-users`);
  return response.data;
};

// Get workspace members for chat
export const getWorkspaceMembersForChatQueryFn = async (workspaceId: string): Promise<{
  status: boolean;
  message: string;
  members: ChatMemberType[];
}> => {
  const response = await API.get(`/chat/workspace/${workspaceId}/members`);
  return response.data;
};

// Search messages
export const searchWorkspaceMessagesQueryFn = async ({
  workspaceId,
  query,
  limit,
}: {
  workspaceId: string;
  query: string;
  limit?: number;
}): Promise<{
  status: boolean;
  message: string;
  messages: Message[];
  query: string;
}> => {
  const params = new URLSearchParams();
  params.append("q", query);
  if (limit) params.append("limit", limit.toString());
  
  const response = await API.get(`/chat/workspace/${workspaceId}/search?${params.toString()}`);
  return response.data;
};

// Get direct conversations
export const getDirectConversationsQueryFn = async (): Promise<{
  status: boolean;
  message: string;
  conversations: DirectConversationType[];
}> => {
  const response = await API.get("/chat/direct/conversations");
  return response.data;
};

// Mark messages as read
export const markMessagesAsReadMutationFn = async (lastMessageId?: string): Promise<{
  status: boolean;
  message: string;
}> => {
  const response = await API.post("/chat/messages/mark-read", {
    lastMessageId,
  });
  return response.data;
};

// Get workspace chat stats
export const getWorkspaceChatStatsQueryFn = async (workspaceId: string): Promise<{
  status: boolean;
  message: string;
  stats: {
    totalMessages: number;
    todayMessages: number;
    activeUsers: number;
  };
}> => {
  const response = await API.get(`/chat/workspace/${workspaceId}/stats`);
  return response.data;
};

// Sidebar: channels + DMs with last message and unread count
export const getWorkspaceConversationsQueryFn = async (
  workspaceId: string
): Promise<{ conversations: Conversation[] }> => {
  const response = await API.get(`/chat/workspace/${workspaceId}/conversations`);
  return response.data;
};

// Photos and files shared in a conversation (newest first)
export const getRoomAttachmentsQueryFn = async (
  roomId: string
): Promise<{ attachments: SharedAttachment[] }> => {
  const response = await API.get(`/chat/rooms/${encodeURIComponent(roomId)}/attachments`);
  return response.data;
};

// Upload chat attachments; send the returned attachments with the message
export const uploadChatFilesMutationFn = async (
  files: File[],
  onProgress?: (percent: number) => void
): Promise<UploadedAttachment[]> => {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const response = await API.post("/chat/uploads", form, {
    timeout: 120_000,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data.attachments;
};

// Wrapper functions for chat components
export const getChatMessages = async (
  type: "workspace" | "project" | "direct",
  params: {
    workspace?: string;
    project?: string;
    otherUserId?: string;
    limit?: number;
    skip?: number;
    before?: string;
  }
) => {
  switch (type) {
    case "workspace": {
      if (!params.workspace) throw new Error("Workspace ID is required");
      const workspaceResponse = await getWorkspaceMessagesQueryFn({
        workspaceId: params.workspace,
        limit: params.limit,
        skip: params.skip,
        before: params.before,
      });
      return {
        messages: workspaceResponse.messages,
        hasMore: workspaceResponse.pagination.hasMore,
      };
    }
      
    case "project": {
      if (!params.project) throw new Error("Project ID is required");
      const projectResponse = await getProjectMessagesQueryFn({
        projectId: params.project,
        limit: params.limit,
        skip: params.skip,
        before: params.before,
      });
      return {
        messages: projectResponse.messages,
        hasMore: projectResponse.pagination.hasMore,
      };
    }
      
    case "direct": {
      if (!params.otherUserId) throw new Error("Other user ID is required");
      const directResponse = await getDirectMessagesQueryFn({
        otherUserId: params.otherUserId,
        limit: params.limit,
        skip: params.skip,
        before: params.before,
      });
      return {
        messages: directResponse.messages,
        hasMore: directResponse.pagination.hasMore,
      };
    }
      
    default:
      throw new Error(`Invalid chat type: ${type}`);
  }
};

export const getOnlineUsers = async (workspaceId: string) => {
  const response = await getOnlineUsersQueryFn(workspaceId);
  return response.onlineUsers;
};

export const getWorkspaceMembers = async (workspaceId: string) => {
  const response = await getWorkspaceMembersForChatQueryFn(workspaceId);
  return response.members;
};

// Send a chat message over REST (used only when the socket is offline)
export const sendChatMessageRestFn = async ({
  chatType,
  targetId,
  content,
  replyTo,
  attachments,
}: {
  chatType: "workspace" | "project" | "direct";
  targetId: string; // workspace, project or other user's id
  content: string;
  replyTo?: string;
  attachments?: UploadedAttachment[];
}): Promise<Message> => {
  const response = await API.post(`/chat/${chatType}/${targetId}/messages`, {
    content,
    replyTo,
    attachments,
  });
  return response.data.data;
};

//******* NOTES ********************************

export const getNotesQueryFn = async (workspaceId: string): Promise<{ notes: NoteSummaryType[] }> => {
  const response = await API.get(`/notes/workspace/${workspaceId}`);
  return response.data;
};

export const getNoteQueryFn = async (workspaceId: string, noteId: string): Promise<{ note: NoteType }> => {
  const response = await API.get(`/notes/workspace/${workspaceId}/${noteId}`);
  return response.data;
};

export const createNoteMutationFn = async ({
  workspaceId,
  data,
}: {
  workspaceId: string;
  data: { title?: string; emoji?: string | null; parentNote?: string | null; visibility?: NoteVisibility; content?: Record<string, unknown>[] };
}): Promise<{ note: NoteType }> => {
  const response = await API.post(`/notes/workspace/${workspaceId}`, data);
  return response.data;
};

export const updateNoteMutationFn = async ({
  workspaceId,
  noteId,
  data,
}: {
  workspaceId: string;
  noteId: string;
  data: UpdateNotePayloadType;
}): Promise<{ note: NoteType }> => {
  const response = await API.patch(`/notes/workspace/${workspaceId}/${noteId}`, data, { timeout: 60_000 });
  return response.data;
};

export const deleteNoteMutationFn = async ({ workspaceId, noteId }: { workspaceId: string; noteId: string }): Promise<{ deletedIds: string[] }> => {
  const response = await API.delete(`/notes/workspace/${workspaceId}/${noteId}`);
  return response.data;
};

//******* CALENDAR ********************************

/** Full-page navigation to Google's consent screen (the API redirects back to the Calendar page) */
export const calendarConnectUrl = (workspaceId: string) =>
  `${baseURL}/calendar/google/connect?workspaceId=${encodeURIComponent(workspaceId)}`;

export const getCalendarConnectionQueryFn = async (): Promise<{ connection: CalendarConnectionType }> => {
  const response = await API.get(`/calendar/connection`);
  return response.data;
};

export const syncCalendarMutationFn = async (): Promise<{ imported: number; updated: number; removed: number; connection: CalendarConnectionType }> => {
  const response = await API.post(`/calendar/google/sync`, {}, { timeout: 60_000 });
  return response.data;
};

export const disconnectCalendarMutationFn = async () => {
  const response = await API.delete(`/calendar/google`);
  return response.data;
};

export const getEventsQueryFn = async (from: Date, to: Date): Promise<{ events: CalendarEventType[] }> => {
  const response = await API.get(`/calendar/events`, { params: { from: from.toISOString(), to: to.toISOString() } });
  return response.data;
};

export const getEventQueryFn = async (eventId: string): Promise<{ event: CalendarEventType }> => {
  const response = await API.get(`/calendar/events/${eventId}`);
  return response.data;
};

export const createEventMutationFn = async (data: EventPayloadType): Promise<{ event: CalendarEventType }> => {
  const response = await API.post(`/calendar/events`, data, { timeout: 30_000 });
  return response.data;
};

export const updateEventMutationFn = async ({ eventId, data }: { eventId: string; data: Partial<EventPayloadType> }): Promise<{ event: CalendarEventType }> => {
  const response = await API.patch(`/calendar/events/${eventId}`, data, { timeout: 30_000 });
  return response.data;
};

export const deleteEventMutationFn = async (eventId: string) => {
  const response = await API.delete(`/calendar/events/${eventId}`, { timeout: 30_000 });
  return response.data;
};

export const snoozeEventMutationFn = async ({ eventId, minutes }: { eventId: string; minutes: number }) => {
  const response = await API.post(`/calendar/events/${eventId}/snooze`, { minutes });
  return response.data;
};

//******* ACCOUNT ********************************

export type AccountType = {
  userId: string;
  name: string;
  email: string;
  profilePicture: string | null;
  hasPassword: boolean;
  providers: string[];
  createdAt: string;
};

export type DeviceSessionType = {
  _id: string;
  os: string;
  browser: string;
  ip: string;
  lastActiveAt: string;
  createdAt: string;
  current: boolean;
};

export const getAccountQueryFn = async (): Promise<{ account: AccountType }> => (await API.get(`/user/account`)).data;
export const updateProfileMutationFn = async (data: { name?: string; profilePicture?: string | null }) =>
  (await API.patch(`/user/profile`, data)).data;
export const changePasswordMutationFn = async (data: { currentPassword?: string; newPassword: string }) =>
  (await API.post(`/user/password`, data)).data;
export const getSessionsQueryFn = async (): Promise<{ sessions: DeviceSessionType[] }> => (await API.get(`/user/sessions`)).data;
export const revokeSessionMutationFn = async (sessionId: string) => (await API.delete(`/user/sessions/${sessionId}`)).data;
export const revokeOtherSessionsMutationFn = async (): Promise<{ count: number; message: string }> => (await API.delete(`/user/sessions`)).data;
export const deleteAccountMutationFn = async (confirmEmail: string) => (await API.delete(`/user`, { data: { confirmEmail } })).data;
