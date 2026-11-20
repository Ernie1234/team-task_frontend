import {
  LucideIcon,
  Settings,
  Users,
  CheckCircle,
  LayoutDashboard,
  MessageCircle,
  NotebookPen,
  CalendarDays,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useAuthContext } from "@/context/auth-provider";
import { Permissions } from "@/constant";
import { useChatUnreadTotal } from "@/hooks/use-conversations";

type ItemType = {
  title: string;
  url: string;
  icon: LucideIcon;
  showBadge?: boolean; // Add this property
};

export function NavMain() {
  const { hasPermission, workspace } = useAuthContext();
  const unreadChatCount = useChatUnreadTotal(workspace?._id);

  const canManageSettings = hasPermission(
    Permissions.MANAGE_WORKSPACE_SETTINGS
  );

  const workspaceId = useWorkspaceId();
  const location = useLocation();

  const pathname = location.pathname;

  const items: ItemType[] = [
    {
      title: "Dashboard",
      url: `/workspace/${workspaceId}`,
      icon: LayoutDashboard,
      showBadge: false,
    },
    {
      title: "Tasks",
      url: `/workspace/${workspaceId}/tasks`,
      icon: CheckCircle,
      showBadge: false,
    },
    {
      title: "Calendar",
      url: `/workspace/${workspaceId}/calendar`,
      icon: CalendarDays,
      showBadge: false,
    },
    {
      title: "Notes",
      url: `/workspace/${workspaceId}/notes`,
      icon: NotebookPen,
      showBadge: false,
    },
    {
      title: "Members",
      url: `/workspace/${workspaceId}/members`,
      icon: Users,
      showBadge: false,
    },
    {
      title: "Chat",
      url: `/workspace/${workspaceId}/chat`,
      icon: MessageCircle,
      showBadge: true,
    },

    ...(canManageSettings
      ? [
          {
            title: "Settings",
            url: `/workspace/${workspaceId}/settings`,
            icon: Settings,
            showBadge: false,
          },
        ]
      : []),
  ];
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={item.title === "Notes" ? pathname.startsWith(item.url) : item.url === pathname}
              asChild
            >
              <Link to={item.url} className="!text-[15px]">
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            {item.showBadge && (() => {
              const count = item.title === "Chat" ? unreadChatCount : 0;
              return count > 0 ? (
                <SidebarMenuBadge>{count > 99 ? "99+" : count}</SidebarMenuBadge>
              ) : null;
            })()}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
