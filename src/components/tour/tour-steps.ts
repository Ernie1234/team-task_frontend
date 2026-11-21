export type TourStep = {
  /** data-tour value of the element to highlight; none = centred card */
  target?: string;
  title: string;
  body: string;
  /** Where the card sits next to the highlighted element */
  side?: "right" | "bottom" | "top" | "left";
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Team Task",
    body: "Here's a quick look around so you know where everything lives. It takes under a minute.",
  },
  {
    target: "workspace",
    title: "Workspaces",
    body: "A workspace keeps a team's projects, tasks, notes and chat together. Switch between them or create a new one here.",
  },
  {
    target: "nav-dashboard",
    title: "Dashboard",
    body: "Your day at a glance: what's due, what's overdue and how the team's work is moving.",
  },
  {
    target: "nav-tasks",
    title: "Tasks",
    body: "Plan work as a list or a board. Open any task to add subtasks, a description and an assignee.",
  },
  {
    target: "projects",
    title: "Projects",
    body: "Group related tasks into projects. Use the + button to create your first one.",
  },
  {
    target: "nav-calendar",
    title: "Calendar",
    body: "Schedule events with reminders. Connect Google Calendar to keep both calendars in sync.",
  },
  {
    target: "nav-notes",
    title: "Notes",
    body: "Write pages with headings, checklists and nested sub-pages. Keep them private or share them with the workspace.",
  },
  {
    target: "nav-chat",
    title: "Chat",
    body: "Talk in workspace and project channels, or message someone directly. You'll see who's online.",
  },
  {
    target: "notifications",
    title: "Notifications",
    body: "Assignments, mentions and reminders show up here.",
    side: "bottom",
  },
  {
    target: "account",
    title: "Your account",
    body: "Edit your profile, change the theme and font, invite people, or take this tour again.",
    side: "right",
  },
  {
    title: "You're all set",
    body: "Start by creating a project, or invite your team so you can work together.",
  },
];
