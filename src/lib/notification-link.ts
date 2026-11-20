// Older notifications were saved with links to routes that don't exist
// ("/workspaces/:id/projects/:id/tasks/:id"). Map them onto real app routes.
export const toAppLink = (link?: string | null): string | null => {
  if (!link) return null;

  const legacyTask = link.match(/^\/workspaces\/([^/]+)\/projects\/([^/]+)/);
  if (legacyTask) return `/workspace/${legacyTask[1]}/project/${legacyTask[2]}`;

  const legacyWorkspace = link.match(/^\/workspaces\/([^/]+)/);
  if (legacyWorkspace) return `/workspace/${legacyWorkspace[1]}`;

  return link.startsWith("/") ? link : null;
};

export const notificationTypeLabel: Record<string, string> = {
  TASK_ASSIGNED: "Task assigned",
  TASK_UPDATED: "Task update",
  MEMBER_JOINED: "New member",
  MEMBER_INVITED: "Invitation",
  WELCOME: "Welcome",
  GENERAL: "General",
  EVENT_REMINDER: "Reminder",
};
