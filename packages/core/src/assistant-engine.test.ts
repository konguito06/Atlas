import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMemoryDatabase } from "../test-support/node-sqlite";
import {
  type ChatMessage,
  type ChatModel,
  createAssistantEngine,
  type ToolCall,
  type ToolSpec,
} from "./assistant-engine";
import type { AtlasData } from "./data";
import { createLocalAtlasData, LOCAL_WORKSPACE } from "./local/local-data";
import { migrate } from "./local/migrations";
import { createOpenAiModel } from "./openai";

// Friday 13 November 2026, 11:30.
const NOW = new Date(2026, 10, 13, 11, 30);
const workspaceId = LOCAL_WORKSPACE.id;

type Turn = { text?: string; calls?: Array<[name: string, input: unknown]> };

/** A model that says what the test tells it to, one turn per call. */
function scriptedModel(turns: Turn[]) {
  const requests: Array<{
    system: string;
    messages: ChatMessage[];
    tools: ToolSpec[];
  }> = [];
  let next = 0;
  const model: ChatModel = {
    async complete(request) {
      // Copied, because the engine goes on adding to the same list.
      requests.push({ ...request, messages: [...request.messages] });
      const turn = turns[next++] ?? { text: "(nothing more scripted)" };
      return {
        text: turn.text ?? "",
        toolCalls: (turn.calls ?? []).map(
          ([name, input], index): ToolCall => ({
            id: `call-${next}-${index}`,
            name,
            arguments:
              typeof input === "string" ? input : JSON.stringify(input),
          }),
        ),
      };
    },
  };
  /** What the engine sent back for each tool call, parsed. */
  const toolResults = () =>
    (requests.at(-1)?.messages ?? []).flatMap((message) =>
      message.role === "tool" ? [JSON.parse(message.content)] : [],
    );
  return { model, requests, toolResults };
}

let data: AtlasData;
beforeEach(async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  data = createLocalAtlasData(database);
});

async function ask(turns: Turn[], { allow = true }: { allow?: boolean } = {}) {
  const script = scriptedModel(turns);
  const confirm = vi.fn(async (_summary: string) => allow);
  let said = "";
  await createAssistantEngine({
    model: script.model,
    data,
    workspaceId,
    now: () => NOW,
  }).reply([{ id: "1", role: "user", text: "Hello" }], {
    onText: (piece) => {
      said += piece;
    },
    confirm,
  });
  return { ...script, confirm, said };
}

test("passes on the model's answer when it needs no tools", async () => {
  const { said, requests } = await ask([{ text: "Good morning." }]);

  expect(said).toBe("Good morning.");
  expect(requests[0]?.messages).toEqual([{ role: "user", text: "Hello" }]);
});

test("tells the model the date, and offers it every tool with a schema", async () => {
  const { requests } = await ask([{ text: "Hi." }]);

  expect(requests[0]?.system).toMatch(
    /Today is Friday,? 13 November 2026 \(2026-11-13\), and the time is 11:30\./,
  );
  expect(requests[0]?.tools.map((tool) => tool.name)).toEqual([
    "get_schedule",
    "list_tasks",
    "list_exams",
    "search_workspace",
    "read_document",
    "create_task",
    "create_event",
  ]);
  expect(requests[0]?.tools[0]?.parameters).toMatchObject({
    type: "object",
    required: ["from", "to"],
  });
});

test("runs the tool the model asks for and hands the result back", async () => {
  await data.createEvent({
    id: "e1",
    workspaceId,
    title: "Dentist",
    date: "2026-11-14",
    startMinute: 600,
    endMinute: 645,
    location: "Clinic",
    notes: "",
    color: "rose",
  });
  await data.createExam({
    id: "x1",
    workspaceId,
    subject: "Algorithms",
    date: "2026-11-14",
    time: "14:00",
    location: "",
    notes: "",
  });

  const { said, toolResults } = await ask([
    { calls: [["get_schedule", { from: "2026-11-14", to: "2026-11-14" }]] },
    { text: "Tomorrow you have the dentist at 10 and an exam at 2." },
  ]);

  expect(toolResults()).toEqual([
    [
      {
        date: "2026-11-14",
        weekday: "Sat",
        timed: [
          {
            kind: "event",
            title: "Dentist",
            start: "10:00",
            end: "10:45",
            location: "Clinic",
          },
        ],
        allDay: [{ kind: "exam", title: "Algorithms", time: "14:00" }],
      },
    ],
  ]);
  expect(said).toBe("Tomorrow you have the dentist at 10 and an exam at 2.");
});

test("lists tasks with what the model needs to reason about them", async () => {
  await data.createTask({
    id: "t1",
    workspaceId,
    title: "Library book",
    notes: "",
    priority: "high",
    dueDate: "2026-11-12",
    dueTime: null,
    projectId: null,
    examId: null,
    parentId: null,
  });

  const { toolResults } = await ask([
    { calls: [["list_tasks", {}]] },
    { text: "One is overdue." },
  ]);

  expect(toolResults()[0]).toEqual([
    {
      id: "t1",
      title: "Library book",
      status: "todo",
      priority: "high",
      dueDate: "2026-11-12",
      due: "Yesterday",
      overdue: true,
    },
  ]);
});

test("finds a document by its words and reads it", async () => {
  await data.createDocument({ id: "d1", workspaceId });
  await data.renameDocument("d1", "Trip plan");
  await data.saveDocumentContent("d1", {
    version: 1,
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Night train." }] },
    ],
  });

  const { toolResults } = await ask([
    { calls: [["search_workspace", { query: "train" }]] },
    { calls: [["read_document", { id: "d1" }]] },
    { text: "It says: night train." },
  ]);

  expect(toolResults()).toEqual([
    [
      {
        kind: "document",
        id: "d1",
        title: "Trip plan",
        excerpt: "Night train.",
      },
    ],
    { title: "Trip plan", text: "Night train.", cutShort: false },
  ]);
});

describe("changes", () => {
  const addTask: Turn = {
    calls: [["create_task", { title: " Buy stamps ", dueDate: "2026-11-14" }]],
  };

  test("asks first, in plain words, and makes the change once allowed", async () => {
    const { confirm, toolResults } = await ask([addTask, { text: "Added." }]);

    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      "Add the task “Buy stamps”, due Tomorrow",
    );
    expect(await data.listTasks(workspaceId)).toMatchObject([
      { title: "Buy stamps", dueDate: "2026-11-14" },
    ]);
    expect(toolResults()[0]).toMatchObject({
      added: true,
      title: "Buy stamps",
    });
  });

  test("changes nothing when refused, and tells the model so", async () => {
    const { toolResults } = await ask([addTask, { text: "Left as it was." }], {
      allow: false,
    });

    expect(await data.listTasks(workspaceId)).toEqual([]);
    expect(toolResults()).toEqual([
      { error: "The person did not allow this." },
    ]);
  });

  test("an event is described with its date and times before it is added", async () => {
    const { confirm } = await ask([
      {
        calls: [
          [
            "create_event",
            {
              title: "Study session",
              date: "2026-11-16",
              startTime: "15:00",
              endTime: "17:00",
            },
          ],
        ],
      },
      { text: "Scheduled." },
    ]);

    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      "Add the event “Study session” on Mon 16 Nov, 15:00 to 17:00",
    );
    expect(await data.listEvents(workspaceId)).toMatchObject([
      { title: "Study session", startMinute: 900, endMinute: 1020 },
    ]);
  });

  test("an event that cannot be valid is refused even after it is allowed", async () => {
    const { toolResults } = await ask([
      {
        calls: [
          [
            "create_event",
            {
              title: "Backwards",
              date: "2026-11-16",
              startTime: "17:00",
              endTime: "15:00",
            },
          ],
        ],
      },
      { text: "That did not work." },
    ]);

    expect(toolResults()).toEqual([
      { error: "The end must be after the start." },
    ]);
    expect(await data.listEvents(workspaceId)).toEqual([]);
  });
});

describe("input the model gets wrong", () => {
  test("is refused before anything runs or is asked", async () => {
    const { confirm, toolResults } = await ask([
      {
        calls: [
          ["create_task", { title: "Essay", dueDate: "next friday" }],
          ["create_task", "{not json"],
          ["delete_everything", {}],
        ],
      },
      { text: "Sorry." },
    ]);

    expect(confirm).not.toHaveBeenCalled();
    expect(await data.listTasks(workspaceId)).toEqual([]);
    const [badDate, badJson, unknown] = toolResults();
    expect(badDate.error).toMatch(/^The input was not valid:/);
    expect(badJson).toEqual({ error: "The input was not valid JSON." });
    expect(unknown).toEqual({ error: "There is no such tool." });
  });

  test("a document that does not exist is an error for the model, not a crash", async () => {
    const { toolResults } = await ask([
      { calls: [["read_document", { id: "nope" }]] },
      { text: "I could not find it." },
    ]);

    expect(toolResults()).toEqual([
      { error: "There is no document with that id." },
    ]);
  });
});

test("gives up when the model keeps asking for tools", async () => {
  const forever = Array.from(
    { length: 10 },
    (): Turn => ({
      calls: [["list_exams", {}]],
    }),
  );

  await expect(ask(forever)).rejects.toThrow(
    "The assistant took too many steps without reaching an answer.",
  );
});

describe("the OpenAI model", () => {
  test("sends the conversation and tools in OpenAI's format and reads the reply", async () => {
    const send = vi.fn(async (_body: unknown) => ({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "list_exams", arguments: "{}" },
              },
            ],
          },
        },
      ],
    }));

    const answer = await createOpenAiModel(send, "test-model").complete({
      system: "Be brief.",
      messages: [
        { role: "user", text: "When is my exam?" },
        {
          role: "assistant",
          text: "",
          toolCalls: [{ id: "call_0", name: "list_exams", arguments: "{}" }],
        },
        { role: "tool", toolCallId: "call_0", content: "[]" },
      ],
      tools: [
        {
          name: "list_exams",
          description: "Exams.",
          parameters: { type: "object" },
        },
      ],
    });

    expect(send).toHaveBeenCalledExactlyOnceWith({
      model: "test-model",
      messages: [
        { role: "system", content: "Be brief." },
        { role: "user", content: "When is my exam?" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_0",
              type: "function",
              function: { name: "list_exams", arguments: "{}" },
            },
          ],
        },
        { role: "tool", tool_call_id: "call_0", content: "[]" },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_exams",
            description: "Exams.",
            parameters: { type: "object" },
          },
        },
      ],
    });
    expect(answer).toEqual({
      text: "",
      toolCalls: [{ id: "call_1", name: "list_exams", arguments: "{}" }],
    });
  });

  test("reads a plain answer", async () => {
    const model = createOpenAiModel(async () => ({
      choices: [{ message: { content: "On Friday." } }],
    }));

    expect(
      await model.complete({ system: "", messages: [], tools: [] }),
    ).toEqual({ text: "On Friday.", toolCalls: [] });
  });

  test("a reply in an unexpected shape is an error, not a guess", async () => {
    const model = createOpenAiModel(async () => ({ error: "nope" }));

    await expect(
      model.complete({ system: "", messages: [], tools: [] }),
    ).rejects.toThrow("The assistant's reply could not be understood.");
  });
});
