import { randomUUID } from "node:crypto";
import {
  createSignedInUser,
  deleteUser,
  type TestUser,
} from "@atlas/db/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { type AtlasData, createAtlasData } from "../src";

let person: TestUser;
let stranger: TestUser;
let data: AtlasData;
let workspaceId: string;

beforeAll(async () => {
  [person, stranger] = await Promise.all([
    createSignedInUser(),
    createSignedInUser(),
  ]);
  data = createAtlasData(person.client);
  workspaceId = (await data.listWorkspaces())[0]?.id ?? "";
});

afterAll(async () => {
  await Promise.all([person, stranger].map(deleteUser));
});

describe("deadlines through the data layer", () => {
  const id = randomUUID();

  test("a deadline is created with or without a time", async () => {
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

  test("ticking a deadline off changes nothing else about it", async () => {
    const saved = await data.updateDeadline(id, { completed: true });

    expect(saved).toEqual({
      id,
      title: "Essay",
      dueDate: "2026-12-01",
      dueTime: "23:59",
      completed: true,
    });
  });

  test("a deadline can be rescheduled and its time removed", async () => {
    const saved = await data.updateDeadline(id, {
      title: "Essay draft",
      dueDate: "2026-12-05",
      dueTime: null,
    });

    expect(saved).toMatchObject({
      title: "Essay draft",
      dueDate: "2026-12-05",
      dueTime: null,
      completed: true,
    });
  });

  test("a deleted deadline is gone", async () => {
    await data.deleteDeadline(id);

    const remaining = await data.listDeadlines(workspaceId);
    expect(remaining.map((deadline) => deadline.title)).toEqual(["Exam"]);
  });

  test("someone else sees none of them", async () => {
    const strangerData = createAtlasData(stranger.client);

    expect(await strangerData.listDeadlines(workspaceId)).toEqual([]);
  });
});

describe("timetables through the data layer", () => {
  const timetableId = randomUUID();
  const entryId = randomUUID();

  test("a timetable is created with the chosen days and hours", async () => {
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

  test("a timetable can be customised", async () => {
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

  test("entries are added, edited and removed", async () => {
    const draft = {
      title: "Algorithms",
      day: 1 as const,
      startMinute: 540,
      endMinute: 630,
      location: "Room 2.1",
      color: "green" as const,
    };

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
    expect(moved).toMatchObject({ day: 3, startMinute: 600, endMinute: 690 });
    expect(listed).toEqual([moved]);
    expect(await data.listTimetableEntries(timetableId)).toEqual([]);
  });

  test("an entry that ends before it starts is refused with a readable message", async () => {
    await expect(
      data.createTimetableEntry({
        id: randomUUID(),
        timetableId,
        title: "Backwards",
        day: 1,
        startMinute: 600,
        endMinute: 540,
        location: "",
        color: "blue",
      }),
    ).rejects.toThrow("Could not add the entry.");
  });

  test("someone else sees none of it and cannot add to it", async () => {
    const strangerData = createAtlasData(stranger.client);

    expect(await strangerData.listTimetables(workspaceId)).toEqual([]);
    expect(await strangerData.listTimetableEntries(timetableId)).toEqual([]);
    await expect(
      strangerData.createTimetableEntry({
        id: randomUUID(),
        timetableId,
        title: "Sneak",
        day: 1,
        startMinute: 540,
        endMinute: 600,
        location: "",
        color: "blue",
      }),
    ).rejects.toThrow("Could not add the entry.");
  });

  test("a deleted timetable is gone", async () => {
    await data.deleteTimetable(timetableId);

    expect(await data.listTimetables(workspaceId)).toEqual([]);
  });
});
