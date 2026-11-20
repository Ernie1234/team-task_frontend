// components/workspace/notification/notification-table.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { INotification } from "@/types/api.type";
import { NotificationStatus } from "@/types/notification.type";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useMarkNotificationsAsRead } from "@/hooks/use-notifications";
import { notificationTypeLabel, toAppLink } from "@/lib/notification-link";

interface NotificationTableProps {
  data: INotification[];
  isLoading?: boolean;
}

// Search the message and the sender's name
const matchesSearch: FilterFn<INotification> = (row, _columnId, value: string) => {
  const query = value.trim().toLowerCase();
  if (!query) return true;
  const { message, sender } = row.original;
  return (
    message.toLowerCase().includes(query) ||
    (sender?.name ?? "").toLowerCase().includes(query)
  );
};

export function NotificationTable({ data, isLoading = false }: NotificationTableProps) {
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();

  const {
    mutate: markAsRead,
    isPending: isMarkingRead,
    variables: markingIds,
  } = useMarkNotificationsAsRead(workspaceId);

  const isMarking = (id: string) => isMarkingRead && !!markingIds?.includes(id);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead([notificationId]);
  };

  const handleOpen = (notification: INotification) => {
    if (!notification.isRead) handleMarkAsRead(notification._id);
    const link = toAppLink(notification.link);
    if (link) navigate(link);
  };

  const columns: ColumnDef<INotification>[] = [
    {
      id: "notification",
      header: "Notification",
      cell: ({ row }) => {
        const notification = row.original;
        const senderName = notification.sender?.name ?? "Someone";
        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={notification.sender?.profilePicture}
                  alt={senderName}
                />
                <AvatarFallback>{senderName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {!notification.isRead && (
                <span
                  className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
                  aria-label="Unread"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs text-muted-foreground">From: {senderName}</p>
            </div>
            {toAppLink(notification.link) && (
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {notificationTypeLabel[row.original.type ?? "GENERAL"] ?? "General"}
        </span>
      ),
    },
    {
      accessorKey: "isRead",
      header: "Status",
      cell: ({ row }) => {
        const { isRead, _id } = row.original;
        return isRead ? (
          <Badge variant="secondary">Read</Badge>
        ) : (
          <Badge
            role="button"
            tabIndex={0}
            className="cursor-pointer"
            title="Mark as read"
            onClick={(event) => {
              event.stopPropagation();
              handleMarkAsRead(_id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                handleMarkAsRead(_id);
              }
            }}
          >
            {isMarking(_id) ? "Updating..." : "Unread"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const filteredData = useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter((notification) =>
      statusFilter === "read" ? notification.isRead : !notification.isRead
    );
  }, [data, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => row._id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: matchesSearch,
    onGlobalFilterChange: setGlobalFilter,
    // Keep the current page when a notification is marked read or a new one arrives
    autoResetPageIndex: false,
    state: { globalFilter },
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search notifications..."
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            table.setPageIndex(0);
          }}
          className="max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as NotificationStatus);
            table.setPageIndex(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All notifications</SelectItem>
            <SelectItem value="unread">Unread only</SelectItem>
            <SelectItem value="read">Read only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Loading notifications…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const clickable = !!toAppLink(row.original.link) || !row.original.isRead;
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => handleOpen(row.original)}
                    className={cn(
                      clickable && "cursor-pointer",
                      row.original.isRead ? "opacity-70" : "bg-primary/5 font-medium"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {data.length === 0 ? "No notifications yet." : "No notifications match your filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
