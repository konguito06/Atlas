import { randomUUID } from "node:crypto";
import {
  createSignedInUser,
  deleteUser,
  type TestUser,
} from "@atlas/db/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createAtlasData } from "../src";
import { describeAtlasData } from "../test-support/data-contract";

const people: TestUser[] = [];

afterAll(async () => {
  await Promise.all(people.map(deleteUser));
});

describeAtlasData("the server-backed data layer", async () => {
  const person = await createSignedInUser();
  people.push(person);
  return createAtlasData(person.client);
});

describe("on the server, what one person saves", () => {
  let owner: TestUser;
  let stranger: TestUser;

  beforeAll(async () => {
    [owner, stranger] = await Promise.all([
      createSignedInUser(),
      createSignedInUser(),
    ]);
    people.push(owner, stranger);
  });

  test("is invisible to someone else, who also cannot add to it", async () => {
    const ownerData = createAtlasData(owner.client);
    const strangerData = createAtlasData(stranger.client);
    const workspaceId = (await ownerData.listWorkspaces())[0]?.id ?? "";
    const timetableId = randomUUID();
    await ownerData.createDocument({ id: randomUUID(), workspaceId });
    await ownerData.createDeadline({
      id: randomUUID(),
      workspaceId,
      title: "Essay",
      dueDate: "2026-12-01",
      dueTime: null,
    });
    await ownerData.createTimetable({
      id: timetableId,
      workspaceId,
      name: "Semester 1",
      days: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 18,
    });

    expect(await strangerData.listDocuments(workspaceId)).toEqual([]);
    expect(await strangerData.listDeadlines(workspaceId)).toEqual([]);
    expect(await strangerData.listTimetables(workspaceId)).toEqual([]);
    expect(await strangerData.listTimetableEntries(timetableId)).toEqual([]);
    await expect(
      strangerData.createDocument({ id: randomUUID(), workspaceId }),
    ).rejects.toThrow("Could not create the document.");
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
});
