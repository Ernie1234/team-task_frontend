import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider } from "@/context/auth-provider";
import Asidebar from "@/components/asidebar/asidebar";
import Header from "@/components/header";
import CreateWorkspaceDialog from "@/components/workspace/create-workspace-dialog";
import CreateProjectDialog from "@/components/workspace/project/create-project-dialog";
import EventDialog from "@/components/calendar/event-dialog";
import SettingsDialog from "@/components/settings/settings-dialog";

const AppLayout = () => {
  const pathname = useLocation().pathname;
  // Chat and Notes are full-page apps with their own panes: no page padding
  const isFullBleed = /\/chat\/?$/.test(pathname) || /\/(notes|calendar)(\/|$)/.test(pathname);
  return (
    <AuthProvider>
      <SidebarProvider>
        <Asidebar />
        <SidebarInset className="overflow-x-hidden">
          <div className="w-full">
            <>
              <Header />
              <div className={isFullBleed ? "" : "mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-10"}>
                <Outlet />
              </div>
            </>
            <CreateWorkspaceDialog />
            <CreateProjectDialog />
            <EventDialog />
            <SettingsDialog />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
};

export default AppLayout;
