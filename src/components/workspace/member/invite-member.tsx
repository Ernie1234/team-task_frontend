import { SectionCard } from "@/components/shared/page-header";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/context/auth-provider";
import { toast } from "@/hooks/use-toast";
import { CheckIcon, CopyIcon, Loader2 } from "lucide-react";
import { BASE_ROUTE } from "@/routes/common/routePaths";
import PermissionsGuard from "@/components/resuable/permission-guard";
import { Permissions } from "@/constant";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteMemberByEmailMutationFn } from "@/lib/api";

const InviteMember = () => {
  const { workspace, workspaceLoading } = useAuthContext();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const workspaceId = useWorkspaceId();
  const { data: membersData, isPending: membersPending } =
    useGetWorkspaceMembers(workspaceId);

  const isEmailExisting = membersData?.members.some(
    (member) => member.userId.email === email
  );

  const queryClient = useQueryClient();
  const { mutate, isPending: isAddingMember } = useMutation({
    mutationFn: (data: { email: string }) =>
      inviteMemberByEmailMutationFn(data, workspaceId),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isEmailExisting) {
      toast({
        title: "Error",
        description: isEmailExisting
          ? "This user is already a member."
          : "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    mutate(
      { email },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["members", "workspace-activities", workspaceId],
          });
          toast({
            title: "Success",
            description: `Invitation sent to ${email}`,
            variant: "success",
          });
          setEmail("");
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const inviteUrl = workspace
    ? `${window.location.origin}${BASE_ROUTE.INVITE_URL.replace(
        ":inviteCode",
        workspace.inviteCode
      )}`
    : "";

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        toast({
          title: "Copied",
          description: "Invite url copied to clipboard",
          variant: "success",
        });
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  return (
    <PermissionsGuard requiredPermission={Permissions.ADD_MEMBER}>
      <SectionCard title="Invite people" description="Share the invite link, or send an invite by email.">
        {workspaceLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="link" className="text-sm">Invite link</Label>
              <div className="mt-1.5 flex gap-2">
                <Input id="link" className="h-10 font-mono text-sm" value={inviteUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" className="h-10 shrink-0 gap-1.5" onClick={handleCopy}>
                  {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
            <form onSubmit={handleInvite}>
              <Label htmlFor="email" className="text-sm">Invite by email</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="email"
                  type="email"
                  className="h-10"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAddingMember || membersPending}
                />
                <Button type="submit" className="h-10 shrink-0" disabled={isAddingMember || isEmailExisting || membersPending}>
                  {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </SectionCard>
    </PermissionsGuard>
  );
};

export default InviteMember;
