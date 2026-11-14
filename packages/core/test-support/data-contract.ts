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

    describe("deadlines", () => {
      const id = randomUUID();

      test("are created with or without a time", async () => {
        const timed = await data.createDeadline({
          id,
          workspaceId,
          title: "Essay",
          dueDate: "2026-12-01",
          dueTime: "23:59",
        });
        const allDay = await data.createDeadline({
          id: randomUUID(),
          workspaceId,
          title: "Exam",
          dueDate: "2026-12-10",
          dueTime: null,
        });

        expect(timed).toEqual({
          id,
          title: "Essay",
          dueDate: "2026-12-01",
          dueTime: "23:59",
          completed: false,
        });
        expect(allDay.dueTime).toBeNull();
        expect(await data.listDeadlines(workspaceId)).toHaveLength(2);
      });

      test("can be ticked off without changing anything else", async () => {
        const saved = await data.updateDeadline(id, { completed: true });

        expect(saved).toEqual({
          id,
          title: "Essay",
          dueDate: "2026-12-01",
          dueTime: "23:59",
          completed: true,
        });
      });

      test("can be rescheduled and have their time removed", async () => {
        const saved = await data.updateDeadline(id, {
          title: "Essay draft",
          dueDate: "2026-12-05",
          dueTime: null,
        });

        expect(saved).toEqual({
          id,
          title: "Essay draft",
          dueDate: "2026-12-05",
          dueTime: null,
          completed: true,
        });
      });

      test("refuse a blank title, with a readable message", async () => {
        await expect(data.updateDeadline(id, { title: "  " })).rejects.toThrow(
          "Could not save the deadline.",
        );
      });

      test("can be deleted", async () => {
        await data.deleteDeadline(id);

        const remaining = await data.listDeadlines(workspaceId);
        expect(remaining.map((deadline) => deadline.title)).toEqual(["Exam"]);
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
