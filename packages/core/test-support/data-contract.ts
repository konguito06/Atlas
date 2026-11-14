import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, test } from "vitest";
import type { AtlasData } from "../src";

/**
 * What every data layer must do, whichever database is behind it. Run it
 * against each implementation so screens can rely on identical behaviour.
 */
export function describeAtlasData(
  name: string,
  setup: () => Promise<AtlasData>,
): void {
  describe(name, () => {
    let data: AtlasData;
    let workspaceId: string;

    beforeAll(async () => {
      data = await setup();
      workspaceId = (await data.listWorkspaces())[0]?.id ?? "";
    });

    test("starts with one workspace, called Personal", async () => {
      const workspaces = await data.listWorkspaces();

      expect(workspaces).toHaveLength(1);
      expect(workspaces[0]?.name).toBe("Personal");
    });

    describe("documents", () => {
      const firstId = randomUUID();
      const secondId = randomUUID();

      test("are created with the given id and listed newest first", async () => {
        const first = await data.createDocument({ id: firstId, workspaceId });
        await data.createDocument({ id: secondId, workspaceId });
        const documents = await data.listDocuments(workspaceId);

        expect(first).toMatchObject({ id: firstId, title: "" });
        expect(documents.map((document) => document.id)).toEqual([
          secondId,
          firstId,
        ]);
      });

      test("can be renamed", async () => {
        const renamed = await data.renameDocument(secondId, "Trip plan");
        const documents = await data.listDocuments(workspaceId);

        expect(renamed).toMatchObject({ id: secondId, title: "Trip plan" });
        expect(documents[0]?.title).toBe("Trip plan");
      });

      test("refuse a title longer than the limit, with a readable message", async () => {
        await expect(
          data.renameDocument(secondId, "x".repeat(301)),
        ).rejects.toThrow("Could not rename the document.");
      });

      test("refuse to rename a document that does not exist", async () => {
        await expect(
          data.renameDocument(randomUUID(), "Ghost"),
        ).rejects.toThrow("Could not rename the document.");
      });

      test("can be deleted", async () => {
        await data.deleteDocument(secondId);
        const documents = await data.listDocuments(workspaceId);

        expect(documents.map((document) => document.id)).toEqual([firstId]);
      });
    });

    describe("tasks and projects", () => {
      const taskId = randomUUID();
      const subtaskId = randomUUID();
      const projectId = randomUUID();
      const draft = {
        title: "Essay",
        notes: "",
        priority: "none" as const,
        dueDate: null,
        dueTime: null,
        projectId: null,
        parentId: null,
      };

      test("a project is created and listed", async () => {
        const created = await data.createProject({
          id: projectId,
          workspaceId,
          name: "History",
          color: "amber",
        });

        expect(created).toEqual({
          id: projectId,
          name: "History",
          color: "amber",
        });
        expect(await data.listProjects(workspaceId)).toEqual([created]);
      });

      test("a task starts as to-do, with whatever was filled in", async () => {
        const created = await data.createTask({
          id: taskId,
          workspaceId,
          ...draft,
          notes: "Two thousand words",
          priority: "high",
          dueDate: "2026-12-01",
          dueTime: "23:59",
          projectId,
        });

        expect(created).toMatchObject({
          id: taskId,
          title: "Essay",
          notes: "Two thousand words",
          status: "todo",
          priority: "high",
          dueDate: "2026-12-01",
          dueTime: "23:59",
          projectId,
          parentId: null,
          completedAt: null,
        });
      });

      test("a task needs neither a date nor a project", async () => {
        const created = await data.createTask({
          id: randomUUID(),
          workspaceId,
          ...draft,
          title: "Someday",
        });

        expect(created).toMatchObject({ dueDate: null, projectId: null });
      });

      test("a subtask belongs to its task, and cannot have subtasks itself", async () => {
        const subtask = await data.createTask({
          id: subtaskId,
          workspaceId,
          ...draft,
          title: "Outline",
          parentId: taskId,
        });

        expect(subtask.parentId).toBe(taskId);
        await expect(
          data.createTask({
            id: randomUUID(),
            workspaceId,
            ...draft,
            title: "Too deep",
            parentId: subtaskId,
          }),
        ).rejects.toThrow("Could not add the task.");
      });

      test("marking a task done records when, and reopening clears it", async () => {
        const done = await data.updateTask(taskId, { status: "done" });
        const reopened = await data.updateTask(taskId, { status: "doing" });

        expect(done.status).toBe("done");
        expect(done.completedAt).toEqual(expect.any(String));
        expect(reopened).toMatchObject({ status: "doing", completedAt: null });
        // Nothing else moved.
        expect(reopened).toMatchObject({ title: "Essay", priority: "high" });
      });

      test("a task can be edited, and its date and project cleared", async () => {
        const saved = await data.updateTask(taskId, {
          title: "Essay draft",
          priority: "low",
          dueDate: null,
          dueTime: null,
          projectId: null,
        });

        expect(saved).toMatchObject({
          title: "Essay draft",
          priority: "low",
          dueDate: null,
          dueTime: null,
          projectId: null,
        });
      });

      test("refuses a blank title, a time without a date, or an unknown project", async () => {
        await expect(data.updateTask(taskId, { title: "  " })).rejects.toThrow(
          "Could not save the task.",
        );
        await expect(
          data.updateTask(taskId, { dueTime: "09:00" }),
        ).rejects.toThrow("Could not save the task.");
        await expect(
          data.updateTask(taskId, { projectId: randomUUID() }),
        ).rejects.toThrow("Could not save the task.");
      });

      test("deleting a project keeps its tasks, without a project", async () => {
        await data.updateTask(taskId, { projectId });

        await data.deleteProject(projectId);

        const tasks = await data.listTasks(workspaceId);
        expect(await data.listProjects(workspaceId)).toEqual([]);
        expect(tasks.find((task) => task.id === taskId)?.projectId).toBeNull();
      });

      test("deleting a task deletes its subtasks", async () => {
        await data.deleteTask(taskId);

        const titles = (await data.listTasks(workspaceId)).map(
          (task) => task.title,
        );
        expect(titles).toEqual(["Someday"]);
      });
    });

    describe("timetables", () => {
      const timetableId = randomUUID();
      const entryId = randomUUID();
      const draft = {
        title: "Algorithms",
        day: 1 as const,
        startMinute: 540,
        endMinute: 630,
        location: "Room 2.1",
        color: "green" as const,
      };

      test("are created with the chosen days and hours", async () => {
        const created = await data.createTimetable({
          id: timetableId,
          workspaceId,
          name: "Semester 1",
          days: [1, 2, 3, 4, 5],
          startHour: 8,
          endHour: 18,
        });

        expect(created).toEqual({
          id: timetableId,
          name: "Semester 1",
          days: [1, 2, 3, 4, 5],
          startHour: 8,
          endHour: 18,
        });
        expect(await data.listTimetables(workspaceId)).toEqual([created]);
      });

      test("can be customised", async () => {
        const saved = await data.updateTimetable(timetableId, {
          name: "Spring",
          days: [1, 2, 3, 4, 5, 6],
          startHour: 7,
          endHour: 22,
        });

        expect(saved).toEqual({
          id: timetableId,
          name: "Spring",
          days: [1, 2, 3, 4, 5, 6],
          startHour: 7,
          endHour: 22,
        });
      });

      test("refuse hours that end before they start", async () => {
        await expect(
          data.updateTimetable(timetableId, {
            name: "Spring",
            days: [1],
            startHour: 18,
            endHour: 9,
          }),
        ).rejects.toThrow("Could not save the timetable.");
      });

      test("hold entries that can be added, edited and removed", async () => {
        const created = await data.createTimetableEntry({
          id: entryId,
          timetableId,
          ...draft,
        });
        const moved = await data.updateTimetableEntry(entryId, {
          ...draft,
          day: 3,
          startMinute: 600,
          endMinute: 690,
        });
        const listed = await data.listTimetableEntries(timetableId);
        await data.deleteTimetableEntry(entryId);

        expect(created).toEqual({ id: entryId, timetableId, ...draft });
        expect(moved).toEqual({
          id: entryId,
          timetableId,
          ...draft,
          day: 3,
          startMinute: 600,
          endMinute: 690,
        });
        expect(listed).toEqual([moved]);
        expect(await data.listTimetableEntries(timetableId)).toEqual([]);
      });

      test("refuse an entry that ends before it starts", async () => {
        await expect(
          data.createTimetableEntry({
            id: randomUUID(),
            timetableId,
            ...draft,
            startMinute: 600,
            endMinute: 540,
          }),
        ).rejects.toThrow("Could not add the entry.");
      });

      test("refuse an entry for a timetable that does not exist", async () => {
        await expect(
          data.createTimetableEntry({
            id: randomUUID(),
            timetableId: randomUUID(),
            ...draft,
          }),
        ).rejects.toThrow("Could not add the entry.");
      });

      test("take their entries with them when deleted", async () => {
        await data.createTimetableEntry({
          id: randomUUID(),
          timetableId,
          ...draft,
        });

        await data.deleteTimetable(timetableId);

        expect(await data.listTimetables(workspaceId)).toEqual([]);
        expect(await data.listTimetableEntries(timetableId)).toEqual([]);
      });
    });
  });
}
