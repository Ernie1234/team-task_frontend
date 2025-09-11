import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getwWorkspaceRecentActivitesQueryFn } from "@/lib/api";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface Props {
  title: string;
}

function RecentActivites({ title }: Props) {
  const workspaceId = useWorkspaceId();

  const { data, isPending } = useQuery({
    queryKey: ["workspace-activities", workspaceId],
    queryFn: () => getwWorkspaceRecentActivitesQueryFn({ workspaceId }),
    staleTime: 0,
    enabled: !!workspaceId,
  });

  const recentActivities = data?.data;

  return (
    <Card className="shadow-none w-full max-h-fit bg-muted">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-medium">{title}</CardTitle>
        <CardDescription>see all</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 mt-2">
        {isPending ? (
          <div className="flex flex-col items-center justify-center h-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : recentActivities && recentActivities.length > 0 ? (
          recentActivities.map((activity, index: number) => (
            <div
              key={index}
              className="flex space-x-1 justify-between items-start w-full"
            >
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 rounded-full">
                  <AvatarImage src={activity.user?.profilePicture || ""} />
                  <AvatarFallback className="rounded-full border border-gray-500">
                    {activity.user?.name?.split(" ")?.[0]?.charAt(0)}
                    {activity.user?.name?.split(" ")?.[1]?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium leading-none truncate">
                    {activity.user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-prose">
                    {(() => {
                      const message =
                        activity.message.length > 25
                          ? `${activity.message.substring(0, 25)}...`
                          : activity.message;

                      const parts = message.split(/"/);

                      return parts.map((part, partIndex) => {
                        if (partIndex % 2 === 1) {
                          // This part was inside quotes
                          return (
                            <span
                              key={partIndex}
                              className="text-primary font-semibold"
                            >
                              {part}
                            </span>
                          );
                        } else {
                          // This part was outside quotes
                          return <span key={partIndex}>{part}</span>;
                        }
                      });
                    })()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate leading-none">
                {format(new Date(activity.createdAt), "h:mm a")}
              </p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-24">
            <p className="text-center text-muted-foreground text-sm">
              No recent activities.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivites;
