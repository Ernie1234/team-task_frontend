import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronsUpDown, LogOut, Plus, Settings, UserRound, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/context/auth-provider";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useCreateWorkspaceDialog from "@/hooks/use-create-workspace-dialog";
import { useAppearanceStore } from "@/hooks/use-appearance";
import { getAllWorkspacesUserIsMemberQueryFn } from "@/lib/api";
import { getAvatarFallbackText } from "@/lib/helper";
import { Permissions } from "@/constant";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

const WorkspaceMark = ({ name, size = "sm" }: { name?: string; size?: "sm" | "lg" }) => (
  <span
    className={
      size === "lg"
        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground"
        : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-semibold"
    }
  >
    {name?.trim().charAt(0).toUpperCase() || "W"}
  </span>
);

/** Notion-style account menu in the sidebar footer */
export function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const { user, workspace, hasPermission } = useAuthContext();
  const { onOpen: newWorkspace } = useCreateWorkspaceDialog();
  const openSettings = useAppearanceStore((s) => s.openSettings);
  const { data } = useQuery({ queryKey: ["userWorkspaces"], queryFn: getAllWorkspacesUserIsMemberQueryFn, staleTime: 60_000 });
  const workspaces = data?.workspaces ?? [];
  const memberCount = workspace?.members?.length ?? 0;
  const go = (path: string) => navigate(`/workspace/${workspaceId}${path}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage src={user?.profilePicture || ""} alt="" className="object-cover" />
            <AvatarFallback className="rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {getAvatarFallbackText(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user?.name}</span>
            <span className="truncate text-xs text-muted-foreground">{workspace?.name ?? user?.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 opacity-60" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 rounded-xl p-1.5" side="top" align="start" sideOffset={6}>
        {/* Current workspace */}
        <div className="flex items-center gap-3 px-2 py-2">
          <WorkspaceMark name={workspace?.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{workspace?.name ?? "Workspace"}</p>
            <p className="text-xs text-muted-foreground">
              Free plan · {memberCount} member{memberCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => openSettings("account")}>
            <UserRound className="mr-2 h-4 w-4" /> Account settings
            <DropdownMenuShortcut>Ctrl ,</DropdownMenuShortcut>
          </DropdownMenuItem>
          {hasPermission(Permissions.MANAGE_WORKSPACE_SETTINGS) && (
            <DropdownMenuItem onSelect={() => go("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Workspace settings
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => go("/members")}>
            <UserPlus className="mr-2 h-4 w-4" /> Invite members
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openSettings("calendar")}>
            <CalendarDays className="mr-2 h-4 w-4" /> Calendar
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeSwitcher />
        <DropdownMenuSeparator />

        {/* Switch workspace */}
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
        <div className="max-h-48 overflow-y-auto">
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws._id} onSelect={() => navigate(`/workspace/${ws._id}`)} className="gap-2">
              <WorkspaceMark name={ws.name} />
              <span className="truncate">{ws.name}</span>
              {ws._id === workspaceId && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuItem onSelect={newWorkspace} className="gap-2 text-primary focus:text-primary">
          <span className="flex h-6 w-6 items-center justify-center">
            <Plus className="h-4 w-4" />
          </span>
          New workspace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
