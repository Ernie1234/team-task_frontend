import InviteMember from "@/components/workspace/member/invite-member";
import AllMembers from "@/components/workspace/member/all-members";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { useAuthContext } from "@/context/auth-provider";

export default function Members() {
  const { workspace } = useAuthContext();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        eyebrow={workspace?.name ?? "Workspace"}
        title="Members"
        description="Everyone here can see the workspace's projects and tasks, and create new tasks."
      />
      <InviteMember />
      <SectionCard title="People" description="Change what each person can do in this workspace.">
        <AllMembers />
      </SectionCard>
    </div>
  );
}
