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
import { Separator } from "@/components/ui/separator";
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
    <div className="flex flex-col pt-0.5 px-0 ">
      <h5 className="text-lg  leading-[30px] font-semibold mb-1">
        Invite members to join you
      </h5>
      <p className="text-sm text-muted-foreground leading-tight">
        Anyone with an invite link can join this free Workspace. You can also
        disable and create a new invite link for this Workspace at any time.
      </p>

      <PermissionsGuard showMessage requiredPermission={Permissions.ADD_MEMBER}>
        {workspaceLoading ? (
          <Loader2
            className="w-8 h-8 
        animate-spin
        place-self-center
        flex"
          />
        ) : (
          <div className="flex py-3 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input
              id="link"
              disabled={true}
              className="disabled:opacity-100 disabled:pointer-events-none"
              value={inviteUrl}
              readOnly
            />
            <Button
              disabled={false}
              className="shrink-0"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        )}
      </PermissionsGuard>
      <Separator className="my-4 !h-[0.5px]" />
      <PermissionsGuard showMessage requiredPermission={Permissions.ADD_MEMBER}>
        <h5 className="text-lg leading-[30px] font-semibold mb-1">
          Invite by Email
        </h5>
        <p className="text-sm text-gray-500 leading-tight">
          Enter the email address of the person you'd like to invite.
        </p>

        {workspaceLoading || membersPending ? (
          <Loader2 className="w-8 h-8 animate-spin place-self-center flex mt-4" />
        ) : (
          <form onSubmit={handleInvite} className="flex py-3 gap-2">
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter member's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAddingMember}
            />
            <Button
              type="submit"
              className="shrink-0 bg-green-500 text-white hover:bg-green-600 rounded-lg p-2"
              disabled={isAddingMember || isEmailExisting}
            >
              {isAddingMember ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Invite"
              )}
            </Button>
          </form>
        )}
      </PermissionsGuard>
    </div>
  );
};

export default InviteMember;
