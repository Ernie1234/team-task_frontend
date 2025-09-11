import { Loader } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { BASE_ROUTE } from "@/routes/common/routePaths";
import useAuth from "@/hooks/api/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invitedUserJoinWorkspaceMutationFn } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

const InviteUser = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const param = useParams();
  const inviteCode = param.inviteCode as string;

  const { data: authData, isPending } = useAuth();
  const user = authData?.user;

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: invitedUserJoinWorkspaceMutationFn,
    onSuccess: (data) => {
      queryClient.resetQueries({
        queryKey: ["userWorkspaces", "workspace-activities"],
      });
      navigate(`/workspace/${data.workspaceId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const returnUrl = encodeURIComponent(
    `${BASE_ROUTE.INVITE_URL.replace(":inviteCode", inviteCode)}`
  );

  // Automatically trigger the join mutation when the user logs in
  useEffect(() => {
    // Wait until the authentication state is no longer pending
    if (!isPending && user) {
      // Check if the invite code exists before trying to join
      if (inviteCode) {
        mutate(inviteCode);
      }
    }
  }, [isPending, user, inviteCode, mutate]);

  if (isPending || isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <Loader className="!w-11 !h-11 animate-spin text-primary" />
        <p className="text-center text-lg text-muted-foreground">
          {isLoading ? "Joining workspace..." : "Verifying user..."}
        </p>
      </div>
    );
  }

  // If user is not logged in, prompt them to sign up or log in
  if (!user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 self-center font-medium"
          >
            <Logo />
            Team Sync.
          </Link>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                Hey there! You're invited to join a TeamSync Workspace!
              </CardTitle>
              <CardDescription>
                Looks like you need to be logged into your TeamSync account to
                join this Workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <Link
                  className="flex-1 w-full text-base"
                  to={`/sign-up?returnUrl=${returnUrl}`}
                >
                  <Button className="w-full">Signup</Button>
                </Link>
                <Link
                  className="flex-1 w-full text-base"
                  to={`/?returnUrl=${returnUrl}`}
                >
                  <Button variant="secondary" className="w-full border">
                    Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback for unexpected states
  return null;
};

export default InviteUser;
