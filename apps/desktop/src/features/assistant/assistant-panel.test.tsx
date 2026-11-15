import type { AssistantEngine, AssistantMessage } from "@atlas/core";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, test } from "vitest";
import { createFakeData, fakeAssistantAccess, renderApp } from "@/test/fakes";

/** An engine whose reply the test hands over piece by piece. */
function engineUnderControl() {
  let onText: (piece: string) => void = () => {};
  let confirm: (summary: string) => Promise<boolean> = async () => false;
  let onActivity: ((what: string) => void) | undefined;
  const answers: boolean[] = [];
  let settle: { resolve: () => void; reject: (error: Error) => void };
  const asked: AssistantMessage[][] = [];
  const engine: AssistantEngine = {
    reply: (conversation, handlers) =>
      new Promise((resolve, reject) => {
        asked.push(conversation);
        onText = handlers.onText;
        confirm = handlers.confirm;
        onActivity = handlers.onActivity;
        settle = { resolve, reject };
      }),
  };
  return {
    engine,
    asked,
    say: (piece: string) => act(() => onText(piece)),
    doing: (what: string) => act(() => onActivity?.(what)),
    /** Has the engine ask to make a change; the answers land in `answers`. */
    askToChange: (summary: string) =>
      act(() => {
        void confirm(summary).then((allowed) => answers.push(allowed));
      }),
    answers,
    finish: () => act(async () => settle.resolve()),
    fail: (message: string) =>
      act(async () => settle.reject(new Error(message))),
  };
}

async function openAssistant() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Open the ATLAS assistant" }),
  );
  return within(await screen.findByRole("dialog", { name: "ATLAS" }));
}

function ask(panel: ReturnType<typeof within>, text: string) {
  fireEvent.change(panel.getByLabelText("Message ATLAS"), {
    target: { value: text },
  });
  fireEvent.click(panel.getByRole("button", { name: "Send" }));
}

const conversation = (panel: ReturnType<typeof within>) =>
  within(panel.getByRole("list", { name: "Messages" }))
    .queryAllByRole("listitem")
    .map((message) => message.textContent);

test("with no key saved, the panel says so, takes no message and leads to Settings", async () => {
  renderApp(createFakeData());

  const panel = await openAssistant();

  expect(panel.getByRole("status").textContent).toBe("Not connected yet.");
  expect(
    panel.getByText(
      "The assistant is not connected. It uses OpenAI with your own API key, which you add in Settings.",
    ),
  ).toBeDefined();
  expect(
    (panel.getByLabelText("Message ATLAS") as HTMLInputElement).disabled,
  ).toBe(true);
  expect(
    (panel.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(
    (
      panel.getByRole("button", {
        name: "Speak to ATLAS (voice is not available yet)",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);

  fireEvent.click(panel.getByRole("button", { name: "Open Settings" }));
  expect(
    await screen.findByRole("heading", { name: "Settings" }),
  ).toBeDefined();
});

test("the panel closes", async () => {
  renderApp(createFakeData());
  const panel = await openAssistant();

  fireEvent.click(panel.getByRole("button", { name: "Close" }));

  await expect
    .poll(() => screen.queryByRole("dialog", { name: "ATLAS" }))
    .toBeNull();
});

test("a question is sent to the engine and its answer appears as it arrives", async () => {
  const { engine, asked, say, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();

  ask(panel, "  When is my next exam?  ");

  expect(conversation(panel)).toEqual(["You: When is my next exam?"]);
  expect(panel.getByRole("status").textContent).toBe("Thinking…");
  expect(
    (panel.getByLabelText("Message ATLAS") as HTMLInputElement).value,
  ).toBe("");
  expect(asked[0]?.map((message) => message.text)).toEqual([
    "When is my next exam?",
  ]);

  say("On ");
  expect(panel.getByRole("status").textContent).toBe("Answering…");
  say("Friday.");
  await finish();

  expect(conversation(panel)).toEqual([
    "You: When is my next exam?",
    "ATLAS: On Friday.",
  ]);
  expect(panel.getByRole("status").textContent).toBe(
    "Ask about your tasks, schedule and documents.",
  );
});

test("nothing can be sent while an answer is on its way", async () => {
  const { engine, asked, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();

  ask(panel, "First");
  ask(panel, "Second");

  expect(asked).toHaveLength(1);
  await finish();
});

test("when the engine fails, the reason is shown and no answer is invented", async () => {
  const { engine, fail } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();

  ask(panel, "Plan my week");
  await fail("The assistant could not be reached.");

  expect(panel.getByRole("alert").textContent).toBe(
    "The assistant could not be reached.",
  );
  expect(conversation(panel)).toEqual(["You: Plan my week"]);
});

test("an engine that says nothing is reported, not passed off as an answer", async () => {
  const { engine, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();

  ask(panel, "Hello");
  await finish();

  expect(panel.getByRole("alert").textContent).toBe(
    "The assistant gave no answer.",
  );
});

test("the conversation is still there after closing and reopening", async () => {
  const { engine, say, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();
  ask(panel, "Hello");
  say("Hello.");
  await finish();

  fireEvent.click(panel.getByRole("button", { name: "Close" }));
  await expect
    .poll(() => screen.queryByRole("dialog", { name: "ATLAS" }))
    .toBeNull();

  expect(conversation(await openAssistant())).toEqual([
    "You: Hello",
    "ATLAS: Hello.",
  ]);
});

test("a change waits for the person, and Allow lets it through", async () => {
  const { engine, askToChange, answers, say, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();
  ask(panel, "Add a task to buy stamps");

  askToChange("Add the task “Buy stamps”");

  const approval = within(panel.getByRole("group", { name: "Approval" }));
  expect(approval.getByText("Add the task “Buy stamps”")).toBeDefined();
  expect(answers).toEqual([]);

  fireEvent.click(approval.getByRole("button", { name: "Allow" }));
  await waitFor(() => expect(answers).toEqual([true]));
  expect(panel.queryByRole("group", { name: "Approval" })).toBeNull();
  say("Added.");
  await finish();
});

test("a change that is not allowed is refused", async () => {
  const { engine, askToChange, answers, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();
  ask(panel, "Add a task");

  askToChange("Add the task “Buy stamps”");
  fireEvent.click(panel.getByRole("button", { name: "Don't allow" }));

  await waitFor(() => expect(answers).toEqual([false]));
  await finish();
});

async function openSettings() {
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
  return within(await screen.findByRole("region", { name: "Assistant" }));
}

test("saving a key in Settings connects the assistant", async () => {
  const access = fakeAssistantAccess();
  renderApp(createFakeData(), access);
  const settings = await openSettings();

  fireEvent.change(settings.getByLabelText("OpenAI API key"), {
    target: { value: "sk-test" },
  });
  fireEvent.click(settings.getByRole("button", { name: "Save key" }));

  expect(await settings.findByText("A key is saved")).toBeDefined();
  expect(access.savedKey).toBe("sk-test");
  // The key is not left on screen or anywhere in the page.
  expect(document.body.innerHTML).not.toContain("sk-test");

  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  const panel = await openAssistant();
  ask(panel, "Hello");
  await waitFor(() =>
    expect(conversation(panel)).toEqual(["You: Hello", "ATLAS: Hello."]),
  );
});

test("a key that cannot be saved says so", async () => {
  renderApp(
    createFakeData(),
    fakeAssistantAccess(undefined, { failing: true }),
  );
  const settings = await openSettings();

  fireEvent.change(settings.getByLabelText("OpenAI API key"), {
    target: { value: "sk-test" },
  });
  fireEvent.click(settings.getByRole("button", { name: "Save key" }));

  expect((await settings.findByRole("alert")).textContent).toBe(
    "The key could not be saved to the keychain.",
  );
});

test("removing the key disconnects the assistant", async () => {
  const { engine } = engineUnderControl();
  const access = fakeAssistantAccess(engine);
  renderApp(createFakeData(), access);
  const settings = await openSettings();

  fireEvent.click(await settings.findByRole("button", { name: "Remove key" }));

  expect(await settings.findByLabelText("OpenAI API key")).toBeDefined();
  expect(access.savedKey).toBeUndefined();
});

test("Settings says what is sent to OpenAI", async () => {
  renderApp(createFakeData());

  const settings = await openSettings();

  expect(settings.getByText(/are sent to OpenAI\./)).toBeDefined();
});

test("a suggested question is asked with one click", async () => {
  const { engine, asked, say, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();

  fireEvent.click(
    await panel.findByRole("button", { name: "When is my next exam?" }),
  );

  expect(asked[0]?.map((message) => message.text)).toEqual([
    "When is my next exam?",
  ]);
  expect(panel.queryByRole("list", { name: "Suggestions" })).toBeNull();
  say("On Tuesday.");
  await finish();
});

test("says what it is doing while it works", async () => {
  const { engine, doing, say, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();
  ask(panel, "What is due?");

  doing("Looking at your tasks");

  expect(panel.getByRole("status").textContent).toBe("Looking at your tasks…");
  say("Nothing.");
  await finish();
  expect(panel.getByRole("status").textContent).toBe(
    "Ask about your tasks, schedule and documents.",
  );
});

test("a new conversation starts empty, but not in the middle of an answer", async () => {
  const { engine, say, finish } = engineUnderControl();
  renderApp(createFakeData(), engine);
  const panel = await openAssistant();
  expect(panel.queryByRole("button", { name: "New conversation" })).toBeNull();

  ask(panel, "Hello");
  expect(
    (
      panel.getByRole("button", {
        name: "New conversation",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  say("Hello.");
  await finish();

  fireEvent.click(panel.getByRole("button", { name: "New conversation" }));

  expect(conversation(panel)).toEqual([]);
  expect(panel.getByRole("list", { name: "Suggestions" })).toBeDefined();
});
