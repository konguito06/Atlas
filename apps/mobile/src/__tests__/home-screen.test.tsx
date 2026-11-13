import { APP_NAME } from "@atlas/core";
import { render, screen } from "@testing-library/react-native";
import HomeScreen from "../app/index";

test("shows the app name from the shared core package", async () => {
  await render(<HomeScreen />);

  expect(screen.getByRole("header", { name: APP_NAME })).toBeOnTheScreen();
});
