import {
  LucideIcon,
  Settings,
  Users,
  CheckCircle,
  LayoutDashboard,
  Bell,
  MessageCircle,
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

type ItemType = {
  title: string;
  url: string;
  icon: LucideIcon;
  showBadge?: boolean; // Add this property
};

export function NavMain() {
  const { hasPermission, workspace } = useAuthContext();

  const unreadNotificationsCount = workspace?.notifications
    ? workspace.notifications.filter((notification) => !notification.isRead)
        .length
    : 0;

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
      title: "Members",
      url: `/workspace/${workspaceId}/members`,
      icon: Users,
      showBadge: false,
    },
    {
      title: "Chat",
      url: `/workspace/${workspaceId}/chat`,
      icon: MessageCircle,
      showBadge: false,
    },
    {
      title: "Notifications",
      url: `/workspace/${workspaceId}/notifications`,
      icon: Bell,
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
              isActive={item.url === pathname}
              asChild
              className="hover:bg-muted-foreground/10"
            >
              <Link to={item.url} className="!text-[15px]">
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            {item.showBadge && unreadNotificationsCount > 0 && (
              <SidebarMenuBadge>{unreadNotificationsCount}</SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
