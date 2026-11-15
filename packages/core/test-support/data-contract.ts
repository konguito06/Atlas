import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, test } from "vitest";
import {
  type AtlasData,
  type AtlasDocument,
  createEmptyDocument,
  parseDocument,
} from "../src";

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

      test("start with the empty document as their content", async () => {
        const content = await data.getDocumentContent(firstId);

        expect(parseDocument(content)).toEqual({
          ok: true,
          document: createEmptyDocument(),
        });
      });

      test("give back exactly the content that was saved", async () => {
        const content: AtlasDocument = {
          version: 1,
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Trip plan" }],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Book the " },
                { type: "text", text: "ferry", marks: [{ type: "bold" }] },
              ],
            },
          ],
        };

        const saved = await data.saveDocumentContent(firstId, content);

        expect(saved.id).toBe(firstId);
        expect(await data.getDocumentContent(firstId)).toEqual(content);
      });

      test("refuse to open or save a document that does not exist", async () => {
        await expect(data.getDocumentContent(randomUUID())).rejects.toThrow(
          "Could not open the document.",
        );
        await expect(
          data.saveDocumentContent(randomUUID(), createEmptyDocument()),
        ).rejects.toThrow("Could not save the document.");
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
        examId: null,
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

    describe("exams", () => {
      const examId = randomUUID();
      const taskId = randomUUID();
      const draft = {
        subject: "Algorithms",
        date: "2026-12-10",
        time: "09:00",
        location: "Hall A",
        notes: "",
      };

      test("an exam is created and listed", async () => {
        const created = await data.createExam({
          id: examId,
          workspaceId,
          ...draft,
        });

        expect(created).toMatchObject({ id: examId, ...draft });
        expect(await data.listExams(workspaceId)).toEqual([created]);
      });

      test("an exam needs only a subject and a date", async () => {
        const id = randomUUID();
        const created = await data.createExam({
          id,
          workspaceId,
          subject: "Statistics",
          date: "2026-12-12",
          time: null,
          location: "",
          notes: "",
        });

        expect(created).toMatchObject({ time: null, location: "" });
        await data.deleteExam(id);
      });

      test("an exam can be edited", async () => {
        const saved = await data.updateExam(examId, {
          ...draft,
          date: "2026-12-11",
          time: null,
        });

        expect(saved).toMatchObject({ date: "2026-12-11", time: null });
      });

      test("refuses a blank subject, and saving an exam that is not there", async () => {
        await expect(
          data.createExam({
            id: randomUUID(),
            workspaceId,
            ...draft,
            subject: "  ",
          }),
        ).rejects.toThrow("Could not add the exam.");
        await expect(data.updateExam(randomUUID(), draft)).rejects.toThrow(
          "Could not save the exam.",
        );
      });

      test("a task can be linked to an exam, and unlinked", async () => {
        const created = await data.createTask({
          id: taskId,
          workspaceId,
          title: "Revise graphs",
          notes: "",
          priority: "none",
          dueDate: null,
          dueTime: null,
          projectId: null,
          examId,
          parentId: null,
        });
        expect(created.examId).toBe(examId);

        expect((await data.updateTask(taskId, { examId: null })).examId).toBe(
          null,
        );
        expect((await data.updateTask(taskId, { examId })).examId).toBe(examId);
      });

      test("refuses to link a task to an exam that is not there", async () => {
        await expect(
          data.updateTask(taskId, { examId: randomUUID() }),
        ).rejects.toThrow("Could not save the task.");
      });

      test("deleting an exam keeps its tasks, without the link", async () => {
        await data.deleteExam(examId);

        const tasks = await data.listTasks(workspaceId);
        expect(await data.listExams(workspaceId)).toEqual([]);
        expect(tasks.find((task) => task.id === taskId)).toMatchObject({
          title: "Revise graphs",
          examId: null,
        });
        await data.deleteTask(taskId);
      });
    });

    describe("events", () => {
      const eventId = randomUUID();
      const draft = {
        title: "Dentist",
        date: "2026-11-20",
        startMinute: 600,
        endMinute: 645,
        location: "",
        notes: "",
        color: "rose" as const,
      };

      test("an event is created and listed", async () => {
        const created = await data.createEvent({
          id: eventId,
          workspaceId,
          ...draft,
        });

        expect(created).toMatchObject({ id: eventId, ...draft });
        expect(await data.listEvents(workspaceId)).toEqual([created]);
      });

      test("an event can be edited into one that takes the whole day", async () => {
        const saved = await data.updateEvent(eventId, {
          ...draft,
          title: "Trip",
          startMinute: null,
          endMinute: null,
        });

        expect(saved).toMatchObject({
          title: "Trip",
          startMinute: null,
          endMinute: null,
        });
      });

      test("refuses a blank title, half a time, and an end before the start", async () => {
        const create = (change: Partial<typeof draft> | object) =>
          data.createEvent({
            id: randomUUID(),
            workspaceId,
            ...draft,
            ...change,
          });

        await expect(create({ title: " " })).rejects.toThrow(
          "Could not add the event.",
        );
        await expect(create({ endMinute: null })).rejects.toThrow(
          "Could not add the event.",
        );
        await expect(create({ endMinute: 500 })).rejects.toThrow(
          "Could not add the event.",
        );
        await expect(data.updateEvent(randomUUID(), draft)).rejects.toThrow(
          "Could not save the event.",
        );
      });

      test("an event can be deleted", async () => {
        await data.deleteEvent(eventId);

        expect(await data.listEvents(workspaceId)).toEqual([]);
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
