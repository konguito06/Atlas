import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";
import {
  createFakeClient,
  createFakeData,
  renderSignedIn,
  VALID_CODE,
} from "./test/fakes";

async function requestCodeFor(email: string) {
  fireEvent.change(await screen.findByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));
  return screen.findByLabelText("Sign-in code");
}

test("a signed-out person signs in with an emailed code and signs out again", async () => {
  const { client, auth } = createFakeClient();
  render(<App client={client} data={createFakeData()} />);

  const codeInput = await requestCodeFor("ana@example.com");
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: "ana@example.com" });

  // Typing the last digit signs in without pressing the button.
  fireEvent.change(codeInput, { target: { value: VALID_CODE } });
  expect(await screen.findByText("Personal")).toBeDefined();
  expect(screen.getByText("ana@example.com")).toBeDefined();
  expect(auth.verifyOtp).toHaveBeenCalledWith({
    email: "ana@example.com",
    token: VALID_CODE,
    type: "email",
  });

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(
    await screen.findByRole("heading", { name: "Sign in to ATLAS" }),
  ).toBeDefined();
});

test("someone with a stored session goes straight to their workspace", async () => {
  renderSignedIn(createFakeData());

  expect(await screen.findByText("Personal")).toBeDefined();
  expect(screen.queryByLabelText("Email")).toBeNull();
});

test("a wrong code shows why and lets the person try again", async () => {
  const { client } = createFakeClient();
  render(<App client={client} data={createFakeData()} />);

  const codeInput = await requestCodeFor("ana@example.com");
  fireEvent.change(codeInput, { target: { value: "000000" } });

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("That code is wrong or has expired.");
  expect((codeInput as HTMLInputElement).value).toBe("");
  expect(screen.queryByText("Personal")).toBeNull();
});

test("an invalid email is refused without sending anything", async () => {
  const { client, auth } = createFakeClient();
  render(<App client={client} data={createFakeData()} />);

  fireEvent.change(await screen.findByLabelText("Email"), {
    target: { value: "not-an-email" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("Enter a valid email address.");
  expect(auth.signInWithOtp).not.toHaveBeenCalled();
});

test("the person can go back and use a different email", async () => {
  const { client } = createFakeClient();
  render(<App client={client} data={createFakeData()} />);

  await requestCodeFor("ana@example.com");
  fireEvent.click(
    screen.getByRole("button", { name: "Use a different email" }),
  );

  expect(await screen.findByLabelText("Email")).toBeDefined();
});

test("a new code can be requested from the code step", async () => {
  const { client, auth } = createFakeClient();
  render(<App client={client} data={createFakeData()} />);

  await requestCodeFor("ana@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

  expect((await screen.findByRole("status")).textContent).toBe(
    "New code sent.",
  );
  expect(auth.signInWithOtp).toHaveBeenCalledTimes(2);
});
