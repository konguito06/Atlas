import { useCallback, useState } from "react";

// Choices about how the app looks on this Mac (theme, sidebar width). They
// describe the device, not the workspace, so they live in the webview's
// storage and not in the workspace database.

function read<Choice extends string>(
  key: string,
  choices: readonly Choice[],
  fallback: Choice,
): Choice {
  try {
    const stored = localStorage.getItem(key);
    return choices.includes(stored as Choice) ? (stored as Choice) : fallback;
  } catch {
    // Storage can be unavailable; the app then just starts from defaults.
    return fallback;
  }
}

/** One remembered choice out of a fixed set. */
export function usePreference<Choice extends string>(
  key: string,
  choices: readonly Choice[],
  fallback: Choice,
): [Choice, (choice: Choice) => void] {
  const [choice, setChoice] = useState(() => read(key, choices, fallback));
  const choose = useCallback(
    (next: Choice) => {
      setChoice(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Still applies until the app is closed.
      }
    },
    [key],
  );
  return [choice, choose];
}
