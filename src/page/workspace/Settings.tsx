import { Palette } from "lucide-react";
import EditWorkspaceForm from "@/components/workspace/edit-workspace-form";
import DeleteWorkspaceCard from "@/components/workspace/settings/delete-workspace-card";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Permissions } from "@/constant";
import withPermission from "@/hoc/with-permission";
import { useAuthContext } from "@/context/auth-provider";
import { useAppearanceStore } from "@/hooks/use-appearance";

const Settings = () => {
  const { workspace } = useAuthContext();
  const openSettings = useAppearanceStore((s) => s.openSettings);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader eyebrow={workspace?.name ?? "Workspace"} title="Settings" description="Manage this workspace's details." />
      <EditWorkspaceForm />
      <SectionCard
        title="Your theme and font"
        description="Appearance is personal: changing it only affects how Team Task looks for you."
        action={
          <Button variant="outline" className="h-9 gap-1.5" onClick={() => openSettings("appearance")}>
            <Palette className="h-4 w-4" />
            Open preferences
          </Button>
        }
      />
      <DeleteWorkspaceCard />
    </div>
  );
};

const SettingsWithPermission = withPermission(Settings, Permissions.MANAGE_WORKSPACE_SETTINGS);

export default SettingsWithPermission;
