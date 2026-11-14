import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Project,
  ProjectDraft,
  Task,
  TaskDraft,
  TaskStatus,
  TasksData,
} from "./tasks";

const tasksKey = (workspaceId: string) => ["tasks", workspaceId] as const;
const projectsKey = (workspaceId: string) => ["projects", workspaceId] as const;

export function useTasks(data: TasksData, workspaceId: string) {
  return useQuery({
    queryKey: tasksKey(workspaceId),
    queryFn: () => data.listTasks(workspaceId),
  });
}

export function useCreateTask(data: TasksData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & TaskDraft) =>
      data.createTask({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<Task[]>(tasksKey(workspaceId), (tasks = []) => [
        ...tasks,
        created,
      ]);
    },
  });
}

export function useUpdateTask(data: TasksData, workspaceId: string) {
  const queryClient = useQueryClient();
  const key = tasksKey(workspaceId);

  function replace(id: string, change: Partial<Task>) {
    queryClient.setQueryData<Task[]>(key, (tasks = []) =>
      tasks.map((task) => (task.id === id ? { ...task, ...change } : task)),
    );
  }

  return useMutation({
    mutationFn: ({
      id,
      ...change
    }: { id: string } & Partial<TaskDraft & { status: TaskStatus }>) =>
      data.updateTask(id, change),
    // Show the change at once (ticking a box should feel instant); put the
    // old values back if saving fails.
    onMutate: async ({ id, ...change }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient
        .getQueryData<Task[]>(key)
        ?.find((task) => task.id === id);
      replace(id, change);
      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) replace(id, context.previous);
    },
    onSuccess: (saved) => replace(saved.id, saved),
  });
}

export function useDeleteTask(data: TasksData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteTask(id),
    onSuccess: (_result, id) => {
      // Its subtasks go with it.
      queryClient.setQueryData<Task[]>(tasksKey(workspaceId), (tasks = []) =>
        tasks.filter((task) => task.id !== id && task.parentId !== id),
      );
    },
  });
}

export function useProjects(data: TasksData, workspaceId: string) {
  return useQuery({
    queryKey: projectsKey(workspaceId),
    queryFn: () => data.listProjects(workspaceId),
  });
}

export function useCreateProject(data: TasksData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & ProjectDraft) =>
      data.createProject({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<Project[]>(
        projectsKey(workspaceId),
        (projects = []) => [...projects, created],
      );
    },
  });
}

export function useUpdateProject(data: TasksData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...draft }: { id: string } & ProjectDraft) =>
      data.updateProject(id, draft),
    onSuccess: (saved) => {
      queryClient.setQueryData<Project[]>(
        projectsKey(workspaceId),
        (projects = []) =>
          projects.map((project) =>
            project.id === saved.id ? saved : project,
          ),
      );
    },
  });
}

export function useDeleteProject(data: TasksData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteProject(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Project[]>(
        projectsKey(workspaceId),
        (projects = []) => projects.filter((project) => project.id !== id),
      );
      // Its tasks are kept, without a project.
      queryClient.setQueryData<Task[]>(tasksKey(workspaceId), (tasks = []) =>
        tasks.map((task) =>
          task.projectId === id ? { ...task, projectId: null } : task,
        ),
      );
    },
  });
}
