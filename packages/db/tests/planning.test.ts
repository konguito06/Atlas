import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  admin,
  createAnonymousClient,
  createSignedInUser,
  deleteUser,
  type TestUser,
} from "./local-supabase";

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

let person: TestUser;
let outsider: TestUser;
let workspaceId: string;
let outsiderWorkspaceId: string;
let deadlineId: string;
let timetableId: string;
let entryId: string;

async function personalWorkspaceId(user: TestUser): Promise<string> {
  const { data, error } = await user.client
    .from("workspaces")
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  [person, outsider] = await Promise.all([
    createSignedInUser(),
    createSignedInUser(),
  ]);
  [workspaceId, outsiderWorkspaceId] = await Promise.all([
    personalWorkspaceId(person),
    personalWorkspaceId(outsider),
  ]);

  const deadline = await person.client
    .from("deadlines")
    .insert({
      workspace_id: workspaceId,
      title: "Essay",
      due_date: "2026-12-01",
    })
    .select()
    .single();
  if (deadline.error) throw deadline.error;
  deadlineId = deadline.data.id;

  const timetable = await person.client
    .from("timetables")
    .insert({ workspace_id: workspaceId, name: "Semester 1" })
    .select()
    .single();
  if (timetable.error) throw timetable.error;
  timetableId = timetable.data.id;

  const entry = await person.client
    .from("timetable_entries")
    .insert({
      timetable_id: timetableId,
      title: "Algorithms",
      day: 1,
      start_minute: 540,
      end_minute: 630,
    })
    .select()
    .single();
  if (entry.error) throw entry.error;
  entryId = entry.data.id;
});

afterAll(async () => {
  await Promise.all([person, outsider].map(deleteUser));
});

describe("a member of the workspace", () => {
  test("gets sensible defaults on a new deadline and timetable", async () => {
    const deadline = await person.client
      .from("deadlines")
      .select("due_time, completed, created_by")
      .eq("id", deadlineId)
      .single();
    const timetable = await person.client
      .from("timetables")
      .select("days, start_hour, end_hour")
      .eq("id", timetableId)
      .single();

    expect(deadline.data).toEqual({
      due_time: null,
      completed: false,
      created_by: person.id,
    });
    expect(timetable.data).toEqual({
      days: [1, 2, 3, 4, 5],
      start_hour: 8,
      end_hour: 20,
    });
  });

  test("can reschedule and complete a deadline", async () => {
    const { data, error } = await person.client
      .from("deadlines")
      .update({ due_date: "2026-12-03", due_time: "23:59", completed: true })
      .eq("id", deadlineId)
      .select("due_date, due_time, completed")
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      due_date: "2026-12-03",
      due_time: "23:59:00",
      completed: true,
    });
  });

  test("can customise a timetable and edit its entries", async () => {
    const timetable = await person.client
      .from("timetables")
      .update({ name: "Spring", days: [1, 2, 3, 4, 5, 6], start_hour: 7 })
      .eq("id", timetableId)
      .select("name, days, start_hour")
      .single();
    const entry = await person.client
      .from("timetable_entries")
      .update({ location: "Room 2.1", color: "green" })
      .eq("id", entryId)
      .select("location, color")
      .single();

    expect(timetable.data).toEqual({
      name: "Spring",
      days: [1, 2, 3, 4, 5, 6],
      start_hour: 7,
    });
    expect(entry.data).toEqual({ location: "Room 2.1", color: "green" });
  });
});

describe("a user outside the workspace", () => {
  test.each(["deadlines", "timetables", "timetable_entries"])(
    "sees nothing in %s",
    async (table) => {
      const { data, error } = await outsider.client.from(table).select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  test("cannot add a deadline or a timetable to the workspace", async () => {
    const deadline = await outsider.client
      .from("deadlines")
      .insert({
        workspace_id: workspaceId,
        title: "Sneak",
        due_date: "2026-12-01",
      });
    const timetable = await outsider.client
      .from("timetables")
      .insert({ workspace_id: workspaceId, name: "Sneak" });

    expect(deadline.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(timetable.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("cannot add an entry to someone else's timetable", async () => {
    const { error } = await outsider.client.from("timetable_entries").insert({
      timetable_id: timetableId,
      title: "Sneak",
      day: 2,
      start_minute: 600,
      end_minute: 660,
    });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("cannot change or delete anything in it", async () => {
    const results = await Promise.all([
      outsider.client
        .from("deadlines")
        .update({ title: "Defaced" })
        .eq("id", deadlineId)
        .select(),
      outsider.client.from("deadlines").delete().eq("id", deadlineId).select(),
      outsider.client
        .from("timetables")
        .update({ name: "Defaced" })
        .eq("id", timetableId)
        .select(),
      outsider.client
        .from("timetables")
        .delete()
        .eq("id", timetableId)
        .select(),
      outsider.client
        .from("timetable_entries")
        .update({ title: "Defaced" })
        .eq("id", entryId)
        .select(),
      outsider.client
        .from("timetable_entries")
        .delete()
        .eq("id", entryId)
        .select(),
    ]);
    const stored = await admin
      .from("timetable_entries")
      .select("title, timetables(name)")
      .eq("id", entryId)
      .single();
    const storedDeadline = await admin
      .from("deadlines")
      .select("title")
      .eq("id", deadlineId)
      .single();

    for (const result of results) {
      expect(result.data).toEqual([]);
    }
    expect(stored.data).toEqual({
      title: "Algorithms",
      timetables: { name: "Spring" },
    });
    expect(storedDeadline.data).toEqual({ title: "Essay" });
  });
});

describe("a signed-out visitor", () => {
  test.each(["deadlines", "timetables", "timetable_entries"])(
    "cannot read %s",
    async (table) => {
      const { data, error } = await createAnonymousClient()
        .from(table)
        .select();

      expect(data).toBeNull();
      expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    },
  );
});

describe("integrity rules that apply even to members", () => {
  test("an entry cannot be moved to another timetable", async () => {
    const other = await outsider.client
      .from("timetables")
      .insert({ workspace_id: outsiderWorkspaceId, name: "Other" })
      .select("id")
      .single();

    const { error } = await person.client
      .from("timetable_entries")
      .update({ timetable_id: other.data?.id })
      .eq("id", entryId);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("a deadline cannot be moved to another workspace", async () => {
    const { error } = await person.client
      .from("deadlines")
      .update({ workspace_id: outsiderWorkspaceId })
      .eq("id", deadlineId);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test.each([
    ["ends before it starts", { start_minute: 600, end_minute: 540 }],
    ["falls on a day that does not exist", { day: 8 }],
    ["uses a colour outside the palette", { color: "#ff00ff" }],
    ["has a blank title", { title: "  " }],
  ])("an entry is refused when it %s", async (_name, change) => {
    const { error } = await person.client
      .from("timetable_entries")
      .update(change)
      .eq("id", entryId);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  test.each([
    ["shows no days", { days: [] }],
    ["shows a day that does not exist", { days: [0, 1] }],
    ["ends before it starts", { start_hour: 18, end_hour: 9 }],
  ])("a timetable is refused when it %s", async (_name, change) => {
    const { error } = await person.client
      .from("timetables")
      .update(change)
      .eq("id", timetableId);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  test("a deadline needs a title", async () => {
    const { error } = await person.client
      .from("deadlines")
      .update({ title: "" })
      .eq("id", deadlineId);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  test("deleting a timetable deletes its entries", async () => {
    await person.client.from("timetables").delete().eq("id", timetableId);

    const { data } = await admin
      .from("timetable_entries")
      .select("id")
      .eq("id", entryId);

    expect(data).toEqual([]);
  });
});
