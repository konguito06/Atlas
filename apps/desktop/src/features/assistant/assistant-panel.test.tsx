import type { AssistantEngine, AssistantMessage } from "@atlas/core";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { createFakeData, renderApp } from "@/test/fakes";

/** An engine whose reply the test hands over piece by piece. */
function engineUnderControl() {
  let onText: (piece: string) => void = () => {};
  let settle: { resolve: () => void; reject: (error: Error) => void };
  const asked: AssistantMessage[][] = [];
  const engine: AssistantEngine = {
    reply: (conversation, handOver) =>
      new Promise((resolve, reject) => {
        asked.push(conversation);
        onText = handOver;
        settle = { resolve, reject };
      }),
  };
  return {
    engine,
    asked,
    say: (piece: string) => act(() => onText(piece)),
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
  within(panel.getByRole("log", { name: "Conversation" }))
    .queryAllByRole("listitem")
    .map((message) => message.textContent);

test("with no assistant connected, the panel says so and takes no message", async () => {
  renderApp(createFakeData());

  const panel = await openAssistant();

  expect(panel.getByRole("status").textContent).toBe("Not connected yet.");
  expect(
    panel.getByText(/ATLAS does not have an assistant yet\./),
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
