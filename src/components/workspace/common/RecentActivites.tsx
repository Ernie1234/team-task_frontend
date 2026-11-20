import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict, format, isToday, isYesterday } from "date-fns";
import { Activity, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getwWorkspaceRecentActivitesQueryFn } from "@/lib/api";
import socketService from "@/lib/socket";
import { initials } from "@/lib/chat-display";
import type { ActivityType, RecentActivitiesByWorkspaceIdResponseType } from "@/types/api.type";

const PREVIEW_COUNT = 6;
const PAGE_SIZE = 20;

const activityKeys = {
  preview: (workspaceId: string) => ["workspace-activities", workspaceId] as const,
  all: (workspaceId: string) => ["workspace-activities", workspaceId, "all"] as const,
};

// "just now", "5m ago", "3h ago", "Yesterday 14:05", "Sep 6"
const formatWhen = (value: string) => {
  const date = new Date(value);
  const minutes = (Date.now() - date.getTime()) / 60000;
  if (minutes < 1) return "just now";
  if (isToday(date)) return formatDistanceToNowStrict(date, { addSuffix: true }).replace(/ minutes?/, "m").replace(/ hours?/, "h");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  if (date.getFullYear() === new Date().getFullYear()) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
};

// Names and titles are stored in quotes: show them emphasised, without the quotes
const ActivityMessage = ({ message }: { message: string }) => (
  <>
    {message.split('"').map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="font-medium text-foreground">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    )}
  </>
);

const ActivityRow = ({ activity }: { activity: ActivityType }) => (
  <li className="flex gap-3">
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={activity.user?.profilePicture || ""} alt="" />
      <AvatarFallback className="bg-background text-[11px]">{initials(activity.user?.name)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
        <ActivityMessage message={activity.message} />
      </p>
      <time
        dateTime={activity.createdAt}
        title={format(new Date(activity.createdAt), "EEEE, MMMM d, yyyy 'at' HH:mm")}
        className="text-xs text-muted-foreground/80"
      >
        {formatWhen(activity.createdAt)}
      </time>
    </div>
  </li>
);

const AllActivitiesSheet = ({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending, isError, refetch } = useInfiniteQuery({
    queryKey: activityKeys.all(workspaceId),
    queryFn: ({ pageParam }) =>
      getwWorkspaceRecentActivitesQueryFn({ workspaceId, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.page + 1 : undefined),
    enabled: open,
  });

  const activities = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination?.totalActivities;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Workspace activity</SheetTitle>
          <SheetDescription>
            {total !== undefined ? `${total} ${total === 1 ? "event" : "events"}, newest first` : "Everything that's happened in this workspace"}
          </SheetDescription>
        </SheetHeader>
        <div className="-mx-6 mt-4 flex-1 overflow-y-auto px-6">
          {isPending ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="space-y-2 py-8 text-center text-sm text-muted-foreground">
              <p>Couldn't load activity.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {activities.map((activity) => (
                  <ActivityRow key={activity._id} activity={activity} />
                ))}
              </ul>
              {hasNextPage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 w-full"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

function RecentActivites({ title }: { title: string }) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: activityKeys.preview(workspaceId),
    queryFn: () => getwWorkspaceRecentActivitesQueryFn({ workspaceId, limit: PREVIEW_COUNT }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  // New activity appears instantly (pushed by the server)
  useEffect(() => {
    return socketService.on("activity:new", ({ activity }: { activity: ActivityType }) => {
      if (!activity || String(activity.workspaceId) !== workspaceId) return;
      queryClient.setQueryData<RecentActivitiesByWorkspaceIdResponseType>(
        activityKeys.preview(workspaceId),
        (current) =>
          current && !current.data.some((a) => a._id === activity._id)
            ? {
                ...current,
                data: [activity, ...current.data].slice(0, PREVIEW_COUNT),
                pagination: {
                  ...current.pagination,
                  totalActivities: (current.pagination?.totalActivities ?? 0) + 1,
                },
              }
            : current
      );
      queryClient.invalidateQueries({ queryKey: activityKeys.all(workspaceId) });
    });
  }, [queryClient, workspaceId]);

  const activities = data?.data ?? [];
  const total = data?.pagination?.totalActivities ?? activities.length;

  return (
    <Card className="w-full max-h-fit bg-muted shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="font-medium">{title}</CardTitle>
        {total > activities.length && (
          <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => setShowAll(true)}>
            See all ({total})
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="space-y-2 py-4 text-center text-sm text-muted-foreground">
            <p>Couldn't load recent activity.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : activities.length > 0 ? (
          <ul className="space-y-4">
            {activities.map((activity) => (
              <ActivityRow key={activity._id} activity={activity} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
            <Activity className="h-6 w-6 opacity-50" />
            <p className="text-sm">Nothing yet. Projects, tasks and new members will show up here.</p>
          </div>
        )}
      </CardContent>

      {workspaceId && <AllActivitiesSheet workspaceId={workspaceId} open={showAll} onOpenChange={setShowAll} />}
    </Card>
  );
}

export default RecentActivites;
