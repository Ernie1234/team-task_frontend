import {
  PermissionType,
  TaskPriorityEnumType,
  TaskStatusEnumType,
} from "@/constant";

export type loginType = { email: string; password: string };
/** Better Auth's sign-in response */
export type LoginResponseType = {
  redirect: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
  };
};

export type registerType = {
  name: string;
  email: string;
  password: string;
};

// USER TYPE
export type UserType = {
  _id: string;
  name: string;
  email: string;
  profilePicture: string | undefined;
  appearance?: import("@/lib/appearance").Appearance | null;
  /** Guided tour; "pending" until a new account finishes or skips it */
  tour?: { status: "pending" | "completed" | "skipped"; updatedAt: string } | null;
  isActive: true;
  lastLogin: null;
  createdAt: Date;
  updatedAt: Date;
  currentWorkspace: {
    _id: string;
    name: string;
    owner: string;
    inviteCode: string;
  };
};

export type CurrentUserResponseType = {
  message: string;
  user: UserType;
};

//******** */ WORLSPACE TYPES ****************
// ******************************************

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "MEMBER_JOINED"
  | "MEMBER_INVITED"
  | "WELCOME"
  | "GENERAL"
  | "EVENT_REMINDER";

export interface INotification {
  _id: string;
  // An id unless the server populated it
  recipient:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        profilePicture?: string;
      };
  sender: { _id: string; name: string; email: string; profilePicture?: string } | null;
  workspaceId?: string;
  type?: NotificationType;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface IActivity {
  _id: string;
  user: string | UserType;
  action: string;
  targetType: string;
  targetId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceNotificationsResponseType = {
  status: boolean;
  message: string;
  data: INotification[];
  unreadCount: number;
};

export interface IWorkspace {
  _id: string;
  name: string;
  description: string;
  owner: string;
  inviteCode: string;
  members: {
    _id: string;
    userId: string;
    workspaceId: string;
    role: {
      _id: string;
      name: string;
      permissions: PermissionType[];
    };
    joinedAt: string;
    createdAt: string;
  }[];
  activities: IActivity[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export type WorkspaceType = {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  inviteCode: string;
};

export type CreateWorkspaceType = {
  name: string;
  description: string;
};

export type EditWorkspaceType = {
  workspaceId: string;
  data: {
    name: string;
    description: string;
  };
};

export type CreateWorkspaceResponseType = {
  message: string;
  workspace: WorkspaceType;
};

export type AllWorkspaceResponseType = {
  message: string;
  workspaces: WorkspaceType[];
};

export type WorkspaceWithMembersType = WorkspaceType & {
  members: {
    _id: string;
    userId: string;
    workspaceId: string;
    role: {
      _id: string;
      name: string;
      permissions: PermissionType[];
    };
    joinedAt: string;
    createdAt: string;
  }[];
};

export type WorkspaceByIdResponseType = {
  status: boolean;
  message: string;
  workspaceWithMembers: IWorkspace;
};

export type ChangeWorkspaceMemberRoleType = {
  workspaceId: string;
  data: {
    roleId: string;
    memberId: string;
  };
};

export type AllMembersInWorkspaceResponseType = {
  message: string;
  members: {
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
      profilePicture: string | null;
    };
    workspaceId: string;
    role: {
      _id: string;
      name: string;
    };
    joinedAt: string;
    createdAt: string;
  }[];
  roles: RoleType[];
};

export type AnalyticsResponseType = {
  message: string;
  analytics: {
    totalTasks: number;
    overdueTasks: number;
    completedTasks: number;
  };
};

export type PaginationType = {
  totalCount: number;
  pageSize: number;
  pageNumber: number;
  totalPages: number;
  skip: number;
  limit: number;
};

export type RoleType = {
  _id: string;
  name: string;
};
// *********** MEMBER ****************

//******** */ PROJECT TYPES ****************
//****************************************** */
export type ProjectType = {
  _id: string;
  name: string;
  emoji: string;
  description: string;
  workspace: string;
  createdBy: {
    _id: string;
    name: string;
    profilePicture: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectPayloadType = {
  workspaceId: string;
  data: {
    emoji: string;
    name: string;
    description: string;
  };
};

export type ProjectResponseType = {
  message: "Project created successfully";
  project: ProjectType;
};

export type EditProjectPayloadType = {
  workspaceId: string;
  projectId: string;
  data: {
    emoji: string;
    name: string;
    description: string;
  };
};

//ALL PROJECTS IN WORKSPACE TYPE
export type AllProjectPayloadType = {
  workspaceId: string;
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  skip?: boolean;
};

export type AllProjectResponseType = {
  message: string;
  projects: ProjectType[];
  pagination: PaginationType;
};

// SINGLE PROJECT IN WORKSPACE TYPE
export type ProjectByIdPayloadType = {
  workspaceId: string;
  projectId: string;
};

// RECENT ACTIVITIES IN WORKSPACE
export type RecentActivitiesByWorkspaceIdPayloadType = {
  workspaceId: string;
  page?: number;
  limit?: number;
};

export type ActivityType = {
  _id: string;
  message: string;
  user: {
    _id: string;
    name: string;
    profilePicture: string | null;
    email: string;
  } | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type RecentActivitiesByWorkspaceIdResponseType = {
  message: string;
  status: boolean;
  data: ActivityType[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalActivities: number;
    hasMore: boolean;
  };
};

//********** */ TASK TYPES ************************
//************************************************* */

export type CreateTaskPayloadType = {
  workspaceId: string;
  projectId: string;
  data: {
    title: string;
    description: string;
    priority: TaskPriorityEnumType;
    status: TaskStatusEnumType;
    assignedTo: string;
    dueDate: string;
    parentTask?: string;
  };
};

//added new for edtiting of task
export type EditTaskPayloadType = {
  taskId: string;
  workspaceId: string;
  projectId: string;
  data: Partial<{
    title: string;
    description: string | null;
    priority: TaskPriorityEnumType;
    status: TaskStatusEnumType;
    assignedTo: string | null;
    dueDate: string | null;
  }>;
};

export type TaskType = {
  _id: string;
  title: string;
  description?: string;
  project?: {
    _id: string;
    emoji: string;
    name: string;
  };
  priority: TaskPriorityEnumType;
  status: TaskStatusEnumType;
  assignedTo: {
    _id: string;
    name: string;
    email?: string;
    profilePicture: string | null;
  } | null;
  createdBy?: string | { _id: string; name: string; profilePicture?: string | null };
  dueDate: string | null;
  taskCode: string;
  createdAt?: string;
  updatedAt?: string;
  // Subtasks: the parent's id (or a summary when fetched on its own)
  parentTask?: string | { _id: string; title: string; taskCode: string; status: TaskStatusEnumType } | null;
  subtaskCount?: number;
  subtaskDoneCount?: number;
};

export type TaskDetailResponseType = {
  task: TaskType;
  subtasks: TaskType[];
};

export type AllTaskPayloadType = {
  workspaceId: string;
  projectId?: string | null;
  keyword?: string | null;
  priority?: TaskPriorityEnumType | null;
  status?: TaskStatusEnumType | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  pageNumber?: number | null;
  pageSize?: number | null;
  parentTask?: string | null;
  sortBy?: "createdAt" | "dueDate" | "priority" | "title" | "updatedAt" | null;
  sortOrder?: "asc" | "desc" | null;
};

export type AllTaskResponseType = {
  message: string;
  tasks: TaskType[];
  pagination: PaginationType;
  totalCount: number;
};

export type DashboardType = {
  totals: {
    total: number;
    open: number;
    done: number;
    inProgress: number;
    overdue: number;
    dueToday: number;
    completedThisWeek: number;
    completionRate: number;
  };
  byStatus: Record<TaskStatusEnumType, number>;
  byPriority: Record<TaskPriorityEnumType, number>;
  completedByDay: { date: string; count: number }[];
  myTasks: TaskType[];
  team: {
    _id: string;
    name: string;
    profilePicture: string | null;
    isOnline: boolean;
    open: number;
    overdue: number;
    inProgress: number;
  }[];
};

// NOTES (Notion-style pages)
export type NoteAuthorType = { _id: string; name: string; profilePicture?: string | null };
export type NoteVisibility = "private" | "workspace";

/** Note without its document, as listed in the page tree */
export type NoteSummaryType = {
  _id: string;
  title: string;
  emoji: string | null;
  excerpt: string;
  workspace: string;
  parentNote: string | null;
  visibility: NoteVisibility;
  createdBy: NoteAuthorType;
  lastEditedBy: NoteAuthorType;
  createdAt: string;
  updatedAt: string;
};

export type NoteType = NoteSummaryType & {
  /** Editor blocks (BlockNote JSON) */
  content: Record<string, unknown>[];
};

export type UpdateNotePayloadType = Partial<{
  title: string;
  emoji: string | null;
  content: Record<string, unknown>[];
  excerpt: string;
  visibility: NoteVisibility;
  parentNote: string | null;
  /** Sent by the live editor: content is a snapshot of the shared document */
  live: boolean;
}>;

// CALENDAR
export type CalendarEventType = {
  _id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  /** Exclusive end (all-day: midnight after the last day) */
  end: string;
  allDay: boolean;
  timeZone: string;
  reminderMinutes: number | null;
  source: "local" | "google";
  syncToGoogle: boolean;
  synced: boolean;
  htmlLink: string | null;
  meetLink: string | null;
  syncError: string | null;
  workspace: string | null;
  updatedAt: string;
};

export type CalendarConnectionType =
  | { connected: false }
  | {
      connected: true;
      provider: "google";
      email: string;
      status: "active" | "error";
      lastError: string | null;
      lastSyncedAt: string | null;
      timeZone: string | null;
    };

export type EventPayloadType = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
  timeZone: string;
  reminderMinutes?: number | null;
  syncToGoogle?: boolean;
  workspaceId?: string;
};
