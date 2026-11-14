import {
  type AtlasData,
  EMPTY_TASK_DRAFT,
  groupTasks,
  type Project,
  subtasksOf,
  TASK_TITLE_MAX_LENGTH,
  type Task,
  toLocalDate,
  useCreateProject,
  useCreateTask,
  useDeleteProject,
  useProjects,
  useTasks,
  useUpdateProject,
  useUpdateTask,
  validateTask,
} from "@atlas/core";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useNow } from "@/lib/use-now";
import { ProjectDialog } from "./project-dialog";
import { TaskDialog } from "./task-dialog";
import { TaskRow } from "./task-row";

// The project picker's two fixed choices, alongside each project's id.
const ALL = "all";
const NO_PROJECT = "none";

export function TasksView({
  data,
  workspaceId,
}: {
  data: AtlasData;
  workspaceId: string;
}) {
  const filterId = useId();
  const tasks = useTasks(data, workspaceId);
  const projects = useProjects(data, workspaceId);
  const createTask = useCreateTask(data, workspaceId);
  const updateTask = useUpdateTask(data, workspaceId);
  const createProject = useCreateProject(data, workspaceId);
  const updateProject = useUpdateProject(data, workspaceId);
  const deleteProject = useDeleteProject(data, workspaceId);
  const [filter, setFilter] = useState(ALL);
  const [newTitle, setNewTitle] = useState("");
  const [addError, setAddError] = useState<string>();
  const [openTaskId, setOpenTaskId] = useState<string>();
  const [projectDialog, setProjectDialog] = useState<"create" | "edit">();
  const [showDone, setShowDone] = useState(false);

  const today = toLocalDate(useNow());
  const allTasks = tasks.data ?? [];
  const allProjects = projects.data ?? [];
  const selectedProject = allProjects.find((project) => project.id === filter);
  // A deleted project falls back to showing everything.
  const activeFilter =
    filter === ALL || filter === NO_PROJECT || selectedProject ? filter : ALL;
  const shown = allTasks.filter(
    (task) =>
      activeFilter === ALL ||
      (activeFilter === NO_PROJECT
        ? task.projectId === null
        : task.projectId === activeFilter),
  );
  const groups = groupTasks(shown, today);
  const openTask = allTasks.find((task) => task.id === openTaskId);
  const error =
    tasks.error ?? projects.error ?? createTask.error ?? updateTask.error;
  const isEmpty =
    tasks.isSuccess && shown.every((task) => task.parentId !== null);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const result = validateTask({
      ...EMPTY_TASK_DRAFT,
      title: newTitle,
      projectId: selectedProject?.id ?? null,
    });
    if (!result.ok) {
      setAddError(result.message);
      return;
    }
    setAddError(undefined);
    createTask.mutate(
      { id: crypto.randomUUID(), ...result.value },
      { onSuccess: () => setNewTitle("") },
    );
  }

  function closeProjectDialog() {
    setProjectDialog(undefined);
    createProject.reset();
    updateProject.reset();
    deleteProject.reset();
  }

  function rows(items: Task[], overdue = false) {
    return items.map((task) => {
      const subtasks = subtasksOf(allTasks, task.id);
      return (
        <TaskRow
          key={task.id}
          task={task}
          today={today}
          overdue={overdue}
          // The project is only worth naming when the list mixes projects.
          project={
            selectedProject
              ? undefined
              : allProjects.find((project) => project.id === task.projectId)
          }
          subtasks={{
            done: subtasks.filter((subtask) => subtask.status === "done")
              .length,
            total: subtasks.length,
          }}
          onToggle={() =>
            updateTask.mutate({
              id: task.id,
              status: task.status === "done" ? "todo" : "done",
            })
          }
          onOpen={() => setOpenTaskId(task.id)}
        />
      );
    });
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-12 pt-14 pb-16">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="mr-auto font-heading text-4xl tracking-tight">Tasks</h1>
        <label htmlFor={filterId} className="text-sm text-muted-foreground">
          Project
        </label>
        <NativeSelect
          id={filterId}
          className="w-44"
          value={activeFilter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value={ALL}>All tasks</option>
          <option value={NO_PROJECT}>No project</option>
          {allProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
        {selectedProject && (
          <Button variant="ghost" onClick={() => setProjectDialog("edit")}>
            Edit project
          </Button>
        )}
        <Button variant="outline" onClick={() => setProjectDialog("create")}>
          New project
        </Button>
      </div>

      <form onSubmit={handleAdd} noValidate className="mt-8 flex gap-2">
        <Input
          aria-label="New task"
          value={newTitle}
          maxLength={TASK_TITLE_MAX_LENGTH}
          placeholder={
            selectedProject
              ? `Add a task to ${selectedProject.name}`
              : "Add a task"
          }
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <Button type="submit" disabled={createTask.isPending}>
          Add task
        </Button>
      </form>

      {(addError ?? error) && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {addError ?? error?.message}
        </p>
      )}

      {isEmpty && (
        <p className="mt-10 text-sm text-muted-foreground">
          {activeFilter === ALL
            ? "No tasks yet. Add the first one above."
            : "No tasks here yet."}
        </p>
      )}

      <Group title="Overdue">{rows(groups.overdue, true)}</Group>
      <Group title="Today">{rows(groups.today)}</Group>
      <Group title="Upcoming">{rows(groups.upcoming)}</Group>
      <Group title="No date">{rows(groups.noDate)}</Group>

      {groups.done.length > 0 && (
        <div className="mt-10">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showDone}
            onClick={() => setShowDone((shownNow) => !shownNow)}
          >
            {showDone ? "Hide" : "Show"} done ({groups.done.length})
          </Button>
          {showDone && (
            <ul aria-label="Done" className="mt-1 divide-y divide-border">
              {rows(groups.done)}
            </ul>
          )}
        </div>
      )}

      {openTask && (
        <TaskDialog
          key={openTask.id}
          data={data}
          workspaceId={workspaceId}
          task={openTask}
          tasks={allTasks}
          projects={allProjects}
          onClose={() => setOpenTaskId(undefined)}
        />
      )}

      {projectDialog === "create" && (
        <ProjectDialog
          mode="create"
          initial={{ name: "", color: "blue" }}
          pending={createProject.isPending}
          saveError={createProject.error?.message}
          onSubmit={(draft) =>
            createProject.mutate(
              { id: crypto.randomUUID(), ...draft },
              {
                onSuccess: (created: Project) => {
                  setFilter(created.id);
                  closeProjectDialog();
                },
              },
            )
          }
          onClose={closeProjectDialog}
        />
      )}
      {projectDialog === "edit" && selectedProject && (
        <ProjectDialog
          mode="edit"
          initial={selectedProject}
          pending={updateProject.isPending || deleteProject.isPending}
          saveError={(updateProject.error ?? deleteProject.error)?.message}
          onSubmit={(draft) =>
            updateProject.mutate(
              { id: selectedProject.id, ...draft },
              { onSuccess: closeProjectDialog },
            )
          }
          onDelete={() =>
            deleteProject.mutate(selectedProject.id, {
              onSuccess: closeProjectDialog,
            })
          }
          onClose={closeProjectDialog}
        />
      )}
    </section>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode[];
}) {
  if (children.length === 0) {
    return null;
  }
  return (
    <div className="mt-10">
      <h2 className="font-heading text-xl">{title}</h2>
      <ul aria-label={title} className="mt-2 divide-y divide-border">
        {children}
      </ul>
    </div>
  );
}
