import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createTaskMutationFn,
  deleteTaskMutationFn,
  editTaskMutationFn,
  getAllTasksQueryFn,
  getTaskByIdQueryFn,
} from "@/lib/api";
import socketService from "@/lib/socket";
import { toast } from "@/hooks/use-toast";
import type {
  AllTaskPayloadType,
  AllTaskResponseType,
  EditTaskPayloadType,
  TaskDetailResponseType,
  TaskType,
} from "@/types/api.type";

// Board and list views show a whole workspace/project at once
export const ALL_TASKS_PAGE = 500;

export type TaskQuery = Omit<AllTaskPayloadType, "pageNumber" | "pageSize">;

export const taskKeys = {
  lists: ["tasks"] as const,
  list: (query: TaskQuery) => ["tasks", query] as const,
  detail: (taskId: string) => ["task", taskId] as const,
};

export const useTasks = (query: TaskQuery, enabled = true) =>
  useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => getAllTasksQueryFn({ ...query, pageNumber: 1, pageSize: ALL_TASKS_PAGE }),
    enabled: enabled && !!query.workspaceId,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

export const useTask = (ref: { workspaceId: string; projectId?: string; taskId?: string | null }) =>
  useQuery({
    queryKey: taskKeys.detail(ref.taskId ?? ""),
    queryFn: () =>
      getTaskByIdQueryFn({ workspaceId: ref.workspaceId, projectId: ref.projectId!, taskId: ref.taskId! }),
    enabled: !!ref.workspaceId && !!ref.projectId && !!ref.taskId,
    staleTime: 15_000,
  });

const patchTask = (task: TaskType, patch: Partial<TaskType>): TaskType => ({ ...task, ...patch });

/** Apply a change to a task wherever it's cached (lists, its detail, its parent's subtasks). */
const applyToCaches = (queryClient: QueryClient, taskId: string, patch: Partial<TaskType>) => {
  queryClient.setQueriesData<AllTaskResponseType>({ queryKey: taskKeys.lists }, (data) =>
    data ? { ...data, tasks: data.tasks.map((t) => (t._id === taskId ? patchTask(t, patch) : t)) } : data
  );
  queryClient.setQueriesData<TaskDetailResponseType>({ queryKey: ["task"] }, (data) => {
    if (!data) return data;
    const isSelf = data.task._id === taskId;
    const inSubtasks = data.subtasks.some((s) => s._id === taskId);
    if (!isSelf && !inSubtasks) return data;
    return {
      task: isSelf ? patchTask(data.task, patch) : data.task,
      subtasks: data.subtasks.map((s) => (s._id === taskId ? patchTask(s, patch) : s)),
    };
  });
};

const refreshTaskViews = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: taskKeys.lists });
  queryClient.invalidateQueries({ queryKey: ["task"] });
  queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
};

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  (error as Error)?.message ||
  "Something went wrong";

export type TaskUpdate = {
  task: Pick<TaskType, "_id"> & { project?: TaskType["project"] | string };
  data: EditTaskPayloadType["data"];
  // Shown immediately (e.g. a populated assignee for a new assignee id)
  optimistic?: Partial<TaskType>;
};

/** Update a task: the change shows instantly and is rolled back if the server refuses it. */
export const useUpdateTask = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, data }: TaskUpdate) =>
      editTaskMutationFn({
        workspaceId,
        projectId: typeof task.project === "string" ? task.project : task.project?._id ?? "",
        taskId: task._id,
        data,
      }),
    onMutate: async ({ task, data, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists });
      const snapshot = [
        ...queryClient.getQueriesData({ queryKey: taskKeys.lists }),
        ...queryClient.getQueriesData({ queryKey: ["task"] }),
      ];
      applyToCaches(queryClient, task._id, { ...(data as Partial<TaskType>), ...optimistic });
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast({ title: "Couldn't update task", description: errorMessage(error), variant: "destructive" });
    },
    onSettled: () => refreshTaskViews(queryClient),
  });
};

export const useCreateTask = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: Partial<{
        title: string;
        description: string;
        status: TaskType["status"];
        priority: TaskType["priority"];
        assignedTo: string;
        dueDate: string;
        parentTask: string;
      }>;
    }) =>
      createTaskMutationFn({
        workspaceId,
        projectId,
        data: data as Parameters<typeof createTaskMutationFn>[0]["data"],
      }),
    onError: (error) =>
      toast({ title: "Couldn't create task", description: errorMessage(error), variant: "destructive" }),
    onSettled: () => refreshTaskViews(queryClient),
  });
};

export const useDeleteTask = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, projectId }: { taskId: string; projectId: string }) =>
      deleteTaskMutationFn({ workspaceId, projectId, taskId }),
    onSuccess: () => toast({ title: "Task deleted" }),
    onError: (error) =>
      toast({ title: "Couldn't delete task", description: errorMessage(error), variant: "destructive" }),
    onSettled: () => refreshTaskViews(queryClient),
  });
};

/** Someone changed a task (in another tab or by another person): refresh what's on screen. */
export const useTaskSocket = () => {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      socketService.on("task:changed", () => {
        refreshTaskViews(queryClient);
      }),
    [queryClient]
  );
};
