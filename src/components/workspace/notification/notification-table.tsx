// components/workspace/notification/notification-table.tsx
import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  getSortedRowModel,
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
import { INotification } from "@/types/api.type";
import { NotificationStatus } from "@/types/notification.type";
import { useAuthContext } from "@/context/auth-provider";
import { useMarkNotificationsAsRead } from "@/hooks/use-notifications";

interface NotificationTableProps {
  data: INotification[];
}

export function NotificationTable({ data }: NotificationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>("all");
  const [globalFilter, setGlobalFilter] = useState("");

  const { refetchWorkspace } = useAuthContext();
  const { mutate: markAsRead, isPending: isMarkingRead } =
    useMarkNotificationsAsRead();

  const handleMarkAsRead = (notificationId: string) => {
    if (notificationId) {
      markAsRead([notificationId], {
        onSuccess: () => {
          refetchWorkspace();
        },
      });
    }
  };

  const columns: ColumnDef<INotification>[] = [
    {
      accessorKey: "avatar",
      header: "",
      cell: ({ row }) => {
        const notification = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={notification.sender?.profilePicture}
                alt={notification.sender?.name}
              />
              <AvatarFallback>
                {notification.sender.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                From: {notification.sender.name}
              </p>
            </div> */}
          </div>
        );
      },
    },
    {
      accessorKey: "sender",
      header: "Notification",
      cell: ({ row }) => {
        const notification = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                From: {notification.sender.name}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isRead",
      header: "Status",
      cell: ({ row }) => {
        const isRead = row.getValue("isRead") as boolean;
        const notificationId = row.original._id;
        return (
          <Badge
            variant={isRead ? "secondary" : "default"}
            className="cursor-pointer"
            onClick={() => !isRead && handleMarkAsRead(notificationId)}
          >
            {isMarkingRead ? "Updating..." : isRead ? "Read" : "Unread"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        );
      },
    },
  ];

  const filteredData = useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter((notification) =>
      statusFilter === "read" ? notification.isRead : !notification.isRead
    );
  }, [data, statusFilter]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as NotificationStatus);
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search notifications..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows?.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row?.getIsSelected() && "selected"}
                  className={
                    row.original?.isRead ? "opacity-70" : "font-medium"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No notifications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
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
    </div>
  );
}
