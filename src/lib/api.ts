import API from "./axios-client";
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

export const loginMutationFn = async (
  data: loginType
): Promise<LoginResponseType> => {
  const response = await API.post("/auth/login", data);
  return response.data;
};

export const registerMutationFn = async (data: registerType) =>
  await API.post("/auth/register", data);

export const verifyEmailMutationFn = async ({
  email,
  token,
}: {
  email: string;
  token: string;
}) => await API.post("/auth/verify-email", { email, token });

export const logoutMutationFn = async () => await API.post("/auth/logout");

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
}: RecentActivitiesByWorkspaceIdPayloadType): Promise<RecentActivitiesByWorkspaceIdResponseType> => {
  const response = await API.get(`/activities/workspace/${workspaceId}`);
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
}: AllTaskPayloadType): Promise<AllTaskResponseType> => {
  const baseUrl = `/tasks/workspace/${workspaceId}/projects/${projectId}/tasks`;

  const queryParams = new URLSearchParams();
  if (keyword) queryParams.append("keyword", keyword);
  if (projectId) queryParams.append("projectId", projectId);
  if (assignedTo) queryParams.append("assignedTo", assignedTo);
  if (priority) queryParams.append("priority", priority);
  if (status) queryParams.append("status", status);
  if (dueDate) queryParams.append("dueDate", dueDate);
  if (pageNumber) queryParams.append("pageNumber", pageNumber?.toString());
  if (pageSize) queryParams.append("pageSize", pageSize?.toString());

  const url = queryParams.toString() ? `${baseUrl}?${queryParams}` : baseUrl;
  const response = await API.get(url);

  console.log("here again: ", response.data);
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

export const markNotificationsAsRead = async (
  notificationIds: string[]
): Promise<void> => {
  const response = await API.patch(`/notifications/mark-as-read`, {
    notificationIds,
  });
  console.log("mark notification as read: ", response.data);
  return response.data;
};
export const markAllNotificationsAsRead = async (
  workspaceId: string
): Promise<void> => {
  const response = await API.patch(
    `/notifications/workspace/${workspaceId}/mark-all-read`
  );
  console.log("mark all notification as read: ", response.data);
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
  messages: any[];
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
  messages: any[];
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
  messages: any[];
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
  onlineUsers: any[];
}> => {
  const response = await API.get(`/chat/workspace/${workspaceId}/online-users`);
  return response.data;
};

// Get workspace members for chat
export const getWorkspaceMembersForChatQueryFn = async (workspaceId: string): Promise<{
  status: boolean;
  message: string;
  members: any[];
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
  messages: any[];
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
  conversations: any[];
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
    case "workspace":
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
      
    case "project":
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
      
    case "direct":
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

// Send message functions
export const sendWorkspaceMessageMutationFn = async ({
  workspaceId,
  content,
  messageType,
  replyTo,
}: {
  workspaceId: string;
  content: string;
  messageType?: "text" | "image" | "file" | "system";
  replyTo?: string;
}): Promise<{
  status: boolean;
  message: string;
  data: any;
}> => {
  const response = await API.post(`/chat/workspace/${workspaceId}/messages`, {
    content,
    messageType,
    replyTo,
  });
  return response.data;
};

export const sendProjectMessageMutationFn = async ({
  projectId,
  content,
  messageType,
  replyTo,
}: {
  projectId: string;
  content: string;
  messageType?: "text" | "image" | "file" | "system";
  replyTo?: string;
}): Promise<{
  status: boolean;
  message: string;
  data: any;
}> => {
  const response = await API.post(`/chat/project/${projectId}/messages`, {
    content,
    messageType,
    replyTo,
  });
  return response.data;
};

export const sendDirectMessageMutationFn = async ({
  otherUserId,
  content,
  messageType,
  replyTo,
}: {
  otherUserId: string;
  content: string;
  messageType?: "text" | "image" | "file" | "system";
  replyTo?: string;
}): Promise<{
  status: boolean;
  message: string;
  data: any;
}> => {
  const response = await API.post(`/chat/direct/${otherUserId}/messages`, {
    content,
    messageType,
    replyTo,
  });
  return response.data;
};
